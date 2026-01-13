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

        // CA par produit (bar)
        $productSales = ProductSale::query()
            ->select([
                'product_sales.product_id',
                'product_sales.subtotal',
                'sales.id as sale_id',
                'sales.sale_date',
            ])
            ->join('sales', 'sales.id', '=', 'product_sales.sale_id')
            ->where('sales.shop_id', $shop->id)
            ->when($from, fn ($q) => $q->whereDate('sales.sale_date', '>=', $from))
            ->when($to, fn ($q) => $q->whereDate('sales.sale_date', '<=', $to))
            ->with('product:id,name')
            ->get();

        // CA par service (line)
        $serviceSales = ServiceSale::query()
            ->select([
                'service_sales.service_id',
                'service_sales.subtotal',
                'sales.id as sale_id',
                'sales.sale_date',
            ])
            ->join('sales', 'sales.id', '=', 'service_sales.sale_id')
            ->where('sales.shop_id', $shop->id)
            ->when($from, fn ($q) => $q->whereDate('sales.sale_date', '>=', $from))
            ->when($to, fn ($q) => $q->whereDate('sales.sale_date', '<=', $to))
            ->with('service:id,name')
            ->get();

        // Évolution du CA par jour (basée sur les détails produits/services pour plus de précision)
        $revenueByDay = $productSales->map(fn ($ps) => [
            'date' => \Carbon\Carbon::parse($ps->sale_date)->toDateString(),
            'amount' => (float) $ps->subtotal,
        ])->concat($serviceSales->map(fn ($ss) => [
            'date' => \Carbon\Carbon::parse($ss->sale_date)->toDateString(),
            'amount' => (float) $ss->subtotal,
        ]))
            ->groupBy('date')
            ->map(fn ($group, $date) => [
                'date' => (string) $date,
                'total_amount' => (float) $group->sum('amount'),
            ])
            ->sortBy('date')
            ->values();

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
        $byClient = Sale::query()
            ->select([
                DB::raw("COALESCE(NULLIF(TRIM(customer_name), ''), 'Client Inconnu') as customer_name"),
                DB::raw('SUM(total_amount) as total_amount'),
            ])
            ->where('shop_id', $shop->id)
            ->when($from, fn ($q) => $q->whereDate('sale_date', '>=', $from))
            ->when($to, fn ($q) => $q->whereDate('sale_date', '<=', $to))
            ->groupBy(DB::raw("COALESCE(NULLIF(TRIM(customer_name), ''), 'Client Inconnu')"))
            ->orderByDesc(DB::raw('SUM(total_amount)'))
            ->limit(20)
            ->get()
            ->map(fn ($row) => [
                'label' => (string) $row->customer_name,
                'amount' => (float) $row->total_amount,
            ])
            ->values();

        // CA par service (line)
        $serviceSales = ServiceSale::query()
            ->select([
                'service_sales.service_id',
                'service_sales.subtotal',
                'sales.id as sale_id',
                'sales.total_amount as sale_total',
            ])
            ->join('sales', 'sales.id', '=', 'service_sales.sale_id')
            ->where('sales.shop_id', $shop->id)
            ->when($from, fn ($q) => $q->whereDate('sales.sale_date', '>=', $from))
            ->when($to, fn ($q) => $q->whereDate('sales.sale_date', '<=', $to))
            ->with('service:id,name')
            ->get();

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
        $byHairdresser = Sale::query()
            ->select([
                DB::raw("COALESCE(hairdressers.name, 'Non assigné') as hairdresser_name"),
                DB::raw('SUM(sales.total_amount) as total_amount'),
            ])
            ->leftJoin('hairdressers', 'hairdressers.id', '=', 'sales.hairdresser_id')
            ->where('sales.shop_id', $shop->id)
            ->when($from, fn ($q) => $q->whereDate('sales.sale_date', '>=', $from))
            ->when($to, fn ($q) => $q->whereDate('sales.sale_date', '<=', $to))
            ->groupBy(DB::raw("COALESCE(hairdressers.name, 'Non assigné')"))
            ->orderByDesc(DB::raw('SUM(sales.total_amount)'))
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

        $bestClientRow = Sale::query()
            ->select([
                DB::raw("COALESCE(NULLIF(TRIM(customer_name), ''), 'Client Inconnu') as customer_name"),
                DB::raw('SUM(total_amount) as total_amount'),
            ])
            ->where('shop_id', $shop->id)
            ->when($from, fn ($q) => $q->whereDate('sale_date', '>=', $from))
            ->when($to, fn ($q) => $q->whereDate('sale_date', '<=', $to))
            ->groupBy(DB::raw("COALESCE(NULLIF(TRIM(customer_name), ''), 'Client Inconnu')"))
            ->orderByDesc(DB::raw('SUM(total_amount)'))
            ->first();

        $bestHairdresserRow = Sale::query()
            ->select([
                DB::raw("COALESCE(hairdressers.name, 'Non assigné') as hairdresser_name"),
                DB::raw('SUM(sales.total_amount) as total_amount'),
            ])
            ->leftJoin('hairdressers', 'hairdressers.id', '=', 'sales.hairdresser_id')
            ->where('sales.shop_id', $shop->id)
            ->when($from, fn ($q) => $q->whereDate('sales.sale_date', '>=', $from))
            ->when($to, fn ($q) => $q->whereDate('sales.sale_date', '<=', $to))
            ->groupBy(DB::raw("COALESCE(hairdressers.name, 'Non assigné')"))
            ->orderByDesc(DB::raw('SUM(sales.total_amount)'))
            ->first();

        $highlights = [
            'top_product' => $topProductRow ? [
                'label' => (string) $topProductRow['label'],
                'amount' => (float) $topProductRow['amount'],
            ] : null,
            'top_service' => $topServiceRow ? [
                'label' => (string) $topServiceRow['label'],
                'amount' => (float) $topServiceRow['amount'],
            ] : null,
            'best_client' => $bestClientRow ? [
                'label' => (string) $bestClientRow->customer_name,
                'amount' => (float) $bestClientRow->total_amount,
            ] : null,
            'best_hairdresser' => $bestHairdresserRow ? [
                'label' => (string) $bestHairdresserRow->hairdresser_name,
                'amount' => (float) $bestHairdresserRow->total_amount,
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
