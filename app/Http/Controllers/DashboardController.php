<?php

namespace App\Http\Controllers;

use App\Models\ProductSale;
use App\Models\Sale;
use App\Models\Service;
use App\Models\ServiceSale;
use App\Models\Shop;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function index(Shop $shop, Request $request): Response
    {
        [$from, $to] = $this->dateRange($request);

        // Définition de la requête de base pour les ventes "uniques" (élimine les doublons de saisie)
        $uniqueSalesQuery = Sale::query()
            ->select([
                DB::raw('MIN(id) as id'),
                'shop_id',
                'sale_date',
                'total_amount',
                'customer_name',
                'hairdresser_id',
            ])
            ->where('shop_id', $shop->id)
            ->when($from, fn ($q) => $q->whereDate('sale_date', '>=', $from))
            ->when($to, fn ($q) => $q->whereDate('sale_date', '<=', $to))
            ->groupBy(['shop_id', 'customer_name', 'total_amount', 'sale_date', 'hairdresser_id']);

        // CA par produit (bar)
        $productSales = ProductSale::query()
            ->select([
                'product_sales.product_id',
                'product_sales.subtotal',
                'sales.id as sale_id',
                'sales.sale_date',
            ])
            ->join('sales', 'sales.id', '=', 'product_sales.sale_id')
            ->joinSub($uniqueSalesQuery, 'unique_s', function ($join) {
                $join->on('unique_s.id', '=', 'sales.id');
            })
            ->where('sales.shop_id', $shop->id)
            ->with('product:id,name')
            ->get();

        // CA par service (line/bar)
        $serviceSales = ServiceSale::query()
            ->select([
                'service_sales.service_id',
                'service_sales.subtotal',
                'sales.id as sale_id',
                'sales.sale_date',
            ])
            ->join('sales', 'sales.id', '=', 'service_sales.sale_id')
            ->joinSub($uniqueSalesQuery, 'unique_s', function ($join) {
                $join->on('unique_s.id', '=', 'sales.id');
            })
            ->where('sales.shop_id', $shop->id)
            ->with('service:id,name')
            ->get();

        // Évolution du CA par jour
        $revenueByDay = DB::table(DB::raw("({$uniqueSalesQuery->toSql()}) as unique_sales"))
            ->mergeBindings($uniqueSalesQuery->getQuery())
            ->select([
                DB::raw('DATE(sale_date) as date'),
                DB::raw('SUM(total_amount) as total_amount'),
            ])
            ->groupBy(DB::raw('DATE(sale_date)'))
            ->orderBy('date')
            ->get()
            ->map(fn ($row) => [
                'date' => (string) $row->date,
                'total_amount' => (float) $row->total_amount,
            ]);

        $byProduct = $productSales->groupBy('product_id')
            ->map(function ($group) {
                return [
                    'label' => (string) ($group->first()->product->name ?? ''),
                    'amount' => (float) $group->sum('subtotal'),
                ];
            })
            ->sortByDesc('amount')
            ->take(20)
            ->values();

        // CA par client (bar)
        $byClient = DB::table(DB::raw("({$uniqueSalesQuery->toSql()}) as unique_sales"))
            ->mergeBindings($uniqueSalesQuery->getQuery())
            ->select([
                DB::raw("COALESCE(NULLIF(TRIM(customer_name), ''), 'Client Inconnu') as customer_name"),
                DB::raw('SUM(total_amount) as total_amount'),
            ])
            ->groupBy(DB::raw("COALESCE(NULLIF(TRIM(customer_name), ''), 'Client Inconnu')"))
            ->orderByDesc('total_amount')
            ->limit(20)
            ->get()
            ->map(fn ($row) => [
                'label' => (string) $row->customer_name,
                'amount' => (float) $row->total_amount,
            ])
            ->values();

        $byService = $serviceSales->groupBy('service_id')
            ->map(function ($group) {
                return [
                    'label' => (string) ($group->first()->service->name ?? ''),
                    'amount' => (float) $group->sum('subtotal'),
                ];
            })
            ->sortByDesc('amount')
            ->take(20)
            ->values();

        // CA par coiffeur (bar)
        $byHairdresser = DB::table(DB::raw("({$uniqueSalesQuery->toSql()}) as unique_sales"))
            ->mergeBindings($uniqueSalesQuery->getQuery())
            ->select([
                DB::raw("COALESCE(hairdressers.name, 'Non assigné') as hairdresser_name"),
                DB::raw('SUM(unique_sales.total_amount) as total_amount'),
            ])
            ->leftJoin('hairdressers', 'hairdressers.id', '=', 'unique_sales.hairdresser_id')
            ->groupBy(DB::raw("COALESCE(hairdressers.name, 'Non assigné')"))
            ->orderByDesc('total_amount')
            ->limit(20)
            ->get()
            ->map(fn ($row) => [
                'label' => (string) $row->hairdresser_name,
                'amount' => (float) $row->total_amount,
            ])
            ->values();

        // Highlights (top 1 per category within the period)
        $topProductRow = $byProduct->first();
        $topServiceRow = $byService->first();
        $topClientRow = $byClient->first();
        $topHairdresserRow = $byHairdresser->first();

        $highlights = [
            'top_product' => $topProductRow ? [
                'label' => (string) $topProductRow['label'],
                'amount' => (float) $topProductRow['amount'],
            ] : null,
            'top_service' => $topServiceRow ? [
                'label' => (string) $topServiceRow['label'],
                'amount' => (float) $topServiceRow['amount'],
            ] : null,
            'best_client' => $topClientRow ? [
                'label' => (string) $topClientRow['label'],
                'amount' => (float) $topClientRow['amount'],
            ] : null,
            'best_hairdresser' => $topHairdresserRow ? [
                'label' => (string) $topHairdresserRow['label'],
                'amount' => (float) $topHairdresserRow['amount'],
            ] : null,
        ];

        return Inertia::render('reports/dashboard', [
            'shop' => ['id' => $shop->id, 'name' => $shop->name],
            'filters' => ['date_from' => $from, 'date_to' => $to],
            'revenue_by_day' => $revenueByDay,
            'by_product' => $byProduct,
            'by_client' => $byClient,
            'by_service' => $byService,
            'by_hairdresser' => $byHairdresser,
            'highlights' => $highlights,
        ]);
    }

    /**
     * @return array{0:?string,1:?string}
     */
    protected function dateRange(Request $request): array
    {
        $from = (string) $request->string('date_from')->toString();
        $to = (string) $request->string('date_to')->toString();

        $from = $from !== '' ? $from : null;
        $to = $to !== '' ? $to : null;

        return [$from, $to];
    }
}
