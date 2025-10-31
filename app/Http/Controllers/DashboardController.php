<?php

namespace App\Http\Controllers;

use App\Models\Product;
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

        // CA total par jour (line)
        $revenueByDay = Sale::query()
            ->select([
                DB::raw('DATE(sale_date) as date'),
                DB::raw('SUM(total_amount) as total_amount'),
            ])
            ->where('shop_id', $shop->id)
            ->when($from, fn ($q) => $q->whereDate('sale_date', '>=', $from))
            ->when($to, fn ($q) => $q->whereDate('sale_date', '<=', $to))
            ->groupBy(DB::raw('DATE(sale_date)'))
            ->orderBy(DB::raw('DATE(sale_date)'))
            ->get()
            ->map(fn ($row) => [
                'date' => (string) $row->date,
                'total_amount' => (float) $row->total_amount,
            ])
            ->values();

        // CA par produit (bar)
        $byProduct = ProductSale::query()
            ->select([
                'product_sales.product_id',
                DB::raw('SUM(product_sales.subtotal) as total_amount'),
            ])
            ->join('sales', 'sales.id', '=', 'product_sales.sale_id')
            ->where('sales.shop_id', $shop->id)
            ->when($from, fn ($q) => $q->whereDate('sales.sale_date', '>=', $from))
            ->when($to, fn ($q) => $q->whereDate('sales.sale_date', '<=', $to))
            ->groupBy('product_sales.product_id')
            ->with('product:id,name')
            ->orderByDesc(DB::raw('SUM(product_sales.subtotal)'))
            ->limit(20)
            ->get()
            ->map(function (ProductSale $ps) {
                /** @var Product|null $product */
                $product = $ps->product ?? null;

                return [
                    'label' => (string) ($product->name ?? ''),
                    'amount' => (float) $ps->total_amount,
                ];
            })
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
        $byService = ServiceSale::query()
            ->select([
                'service_sales.service_id',
                DB::raw('SUM(service_sales.subtotal) as total_amount'),
            ])
            ->join('sales', 'sales.id', '=', 'service_sales.sale_id')
            ->where('sales.shop_id', $shop->id)
            ->when($from, fn ($q) => $q->whereDate('sales.sale_date', '>=', $from))
            ->when($to, fn ($q) => $q->whereDate('sales.sale_date', '<=', $to))
            ->groupBy('service_sales.service_id')
            ->with('service:id,name')
            ->orderByDesc(DB::raw('SUM(service_sales.subtotal)'))
            ->limit(20)
            ->get()
            ->map(function (ServiceSale $ss) {
                /** @var Service|null $service */
                $service = $ss->service ?? null;

                return [
                    'label' => (string) ($service->name ?? ''),
                    'amount' => (float) $ss->total_amount,
                ];
            })
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
        $topProductRow = ProductSale::query()
            ->select([
                'product_sales.product_id',
                DB::raw('SUM(product_sales.subtotal) as total_amount'),
            ])
            ->join('sales', 'sales.id', '=', 'product_sales.sale_id')
            ->where('sales.shop_id', $shop->id)
            ->when($from, fn ($q) => $q->whereDate('sales.sale_date', '>=', $from))
            ->when($to, fn ($q) => $q->whereDate('sales.sale_date', '<=', $to))
            ->groupBy('product_sales.product_id')
            ->with('product:id,name')
            ->orderByDesc(DB::raw('SUM(product_sales.subtotal)'))
            ->first();

        $topServiceRow = ServiceSale::query()
            ->select([
                'service_sales.service_id',
                DB::raw('SUM(service_sales.subtotal) as total_amount'),
            ])
            ->join('sales', 'sales.id', '=', 'service_sales.sale_id')
            ->where('sales.shop_id', $shop->id)
            ->when($from, fn ($q) => $q->whereDate('sales.sale_date', '>=', $from))
            ->when($to, fn ($q) => $q->whereDate('sales.sale_date', '<=', $to))
            ->groupBy('service_sales.service_id')
            ->with('service:id,name')
            ->orderByDesc(DB::raw('SUM(service_sales.subtotal)'))
            ->first();

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
                'label' => (string) optional($topProductRow->product)->name,
                'amount' => (float) $topProductRow->total_amount,
            ] : null,
            'top_service' => $topServiceRow ? [
                'label' => (string) optional($topServiceRow->service)->name,
                'amount' => (float) $topServiceRow->total_amount,
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
