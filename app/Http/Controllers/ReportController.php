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
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use Inertia\Response;

class ReportController extends Controller
{
    /**
     * Register report routes within an existing Route::prefix('shops/{shop}') group.
     */
    public static function routes(): void
    {
        Route::get('products', [self::class, 'productSales'])->name('products');
        Route::get('services', [self::class, 'serviceSales'])->name('services');
        Route::get('clients', [self::class, 'clients'])->name('clients');
        Route::get('hairdressers', [self::class, 'hairdressers'])->name('hairdressers');
    }

    public function productSales(Shop $shop, Request $request): Response
    {
        [$from, $to] = $this->dateRange($request);

        $rows = ProductSale::query()
            ->select([
                'product_sales.product_id',
                DB::raw('SUM(product_sales.quantity) as total_qty'),
                DB::raw('SUM(product_sales.subtotal) as total_amount'),
            ])
            ->join('sales', 'sales.id', '=', 'product_sales.sale_id')
            ->where('sales.shop_id', $shop->id)
            ->when($from, fn ($q) => $q->whereDate('sales.sale_date', '>=', $from))
            ->when($to, fn ($q) => $q->whereDate('sales.sale_date', '<=', $to))
            ->groupBy('product_sales.product_id')
            ->with('product:id,name,price')
            ->orderByDesc(DB::raw('SUM(product_sales.subtotal)'))
            ->get()
            ->map(function (ProductSale $ps) {
                /** @var Product|null $product */
                $product = $ps->product ?? null;

                return [
                    'product_id' => $ps->product_id,
                    'product_name' => (string) ($product->name ?? ''),
                    'unit_price' => (float) ($product->price ?? 0),
                    'total_qty' => (int) $ps->total_qty,
                    'total_amount' => (float) $ps->total_amount,
                ];
            })
            ->values();

        return Inertia::render('reports/product-sales', [
            'shop' => ['id' => $shop->id, 'name' => $shop->name],
            'filters' => ['date_from' => $from, 'date_to' => $to],
            'rows' => $rows,
            'totals' => [
                'count_products' => $rows->count(),
                'sum_qty' => (int) $rows->sum('total_qty'),
                'sum_amount' => (float) $rows->sum('total_amount'),
            ],
        ]);
    }

    public function serviceSales(Shop $shop, Request $request): Response
    {
        [$from, $to] = $this->dateRange($request);

        $rows = ServiceSale::query()
            ->select([
                'service_sales.service_id',
                DB::raw('COUNT(service_sales.service_id) as total_count'),
                DB::raw('SUM(service_sales.subtotal) as total_amount'),
            ])
            ->join('sales', 'sales.id', '=', 'service_sales.sale_id')
            ->where('sales.shop_id', $shop->id)
            ->when($from, fn ($q) => $q->whereDate('sales.sale_date', '>=', $from))
            ->when($to, fn ($q) => $q->whereDate('sales.sale_date', '<=', $to))
            ->groupBy('service_sales.service_id')
            ->with('service:id,name,price')
            ->orderByDesc(DB::raw('SUM(service_sales.subtotal)'))
            ->get()
            ->map(function (ServiceSale $ss) {
                /** @var Service|null $service */
                $service = $ss->service ?? null;

                return [
                    'service_id' => $ss->service_id,
                    'service_name' => (string) ($service->name ?? ''),
                    'unit_price' => (float) ($service->price ?? 0),
                    'total_count' => (int) $ss->total_count,
                    'total_amount' => (float) $ss->total_amount,
                ];
            })
            ->values();

        return Inertia::render('reports/service-sales', [
            'shop' => ['id' => $shop->id, 'name' => $shop->name],
            'filters' => ['date_from' => $from, 'date_to' => $to],
            'rows' => $rows,
            'totals' => [
                'count_services' => $rows->count(),
                'sum_count' => (int) $rows->sum('total_count'),
                'sum_amount' => (float) $rows->sum('total_amount'),
            ],
        ]);
    }

    public function clients(Shop $shop, Request $request): Response
    {
        [$from, $to] = $this->dateRange($request);

        $rows = Sale::query()
            ->select([
                DB::raw("COALESCE(NULLIF(TRIM(customer_name), ''), 'Client Inconnu') as customer_name"),
                DB::raw('COUNT(*) as orders_count'),
                DB::raw('SUM(total_amount) as total_spent'),
            ])
            ->where('shop_id', $shop->id)
            ->when($from, fn ($q) => $q->whereDate('sale_date', '>=', $from))
            ->when($to, fn ($q) => $q->whereDate('sale_date', '<=', $to))
            ->groupBy(DB::raw("COALESCE(NULLIF(TRIM(customer_name), ''), 'Client Inconnu')"))
            ->orderByDesc(DB::raw('SUM(total_amount)'))
            ->get()
            ->map(function ($row) {
                return [
                    'customer_name' => (string) $row->customer_name,
                    'orders_count' => (int) $row->orders_count,
                    'total_spent' => (float) $row->total_spent,
                ];
            })
            ->values();

        return Inertia::render('reports/clients', [
            'shop' => ['id' => $shop->id, 'name' => $shop->name],
            'filters' => ['date_from' => $from, 'date_to' => $to],
            'rows' => $rows,
            'totals' => [
                'count_clients' => $rows->count(),
                'sum_orders' => (int) $rows->sum('orders_count'),
                'sum_amount' => (float) $rows->sum('total_spent'),
            ],
        ]);
    }

    public function hairdressers(Shop $shop, Request $request): Response
    {
        [$from, $to] = $this->dateRange($request);

        $rows = Sale::query()
            ->select([
                DB::raw("COALESCE(hairdressers.name, 'Non assigné') as hairdresser_name"),
                DB::raw('COUNT(sales.id) as orders_count'),
                DB::raw('SUM(sales.total_amount) as total_amount'),
            ])
            ->leftJoin('hairdressers', 'hairdressers.id', '=', 'sales.hairdresser_id')
            ->where('sales.shop_id', $shop->id)
            ->when($from, fn ($q) => $q->whereDate('sales.sale_date', '>=', $from))
            ->when($to, fn ($q) => $q->whereDate('sales.sale_date', '<=', $to))
            ->groupBy(DB::raw("COALESCE(hairdressers.name, 'Non assigné')"))
            ->orderByDesc(DB::raw('SUM(sales.total_amount)'))
            ->get()
            ->map(function ($row) {
                return [
                    'hairdresser_name' => (string) $row->hairdresser_name,
                    'orders_count' => (int) $row->orders_count,
                    'total_amount' => (float) $row->total_amount,
                ];
            })
            ->values();

        return Inertia::render('reports/hairdressers', [
            'shop' => ['id' => $shop->id, 'name' => $shop->name],
            'filters' => ['date_from' => $from, 'date_to' => $to],
            'rows' => $rows,
            'totals' => [
                'count_hairdressers' => $rows->count(),
                'sum_orders' => (int) $rows->sum('orders_count'),
                'sum_amount' => (float) $rows->sum('total_amount'),
            ],
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
