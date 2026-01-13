<?php

namespace App\Http\Controllers;

use App\Models\ProductSale;
use App\Models\Sale;
use App\Models\ServiceSale;
use App\Models\Shop;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class ReportController extends Controller
{
    public function productSales(Shop $shop, Request $request): Response
    {
        $data = $this->getProductSalesData($shop, $request);

        return Inertia::render('reports/product-sales', [
            'shop' => $shop->only('id', 'name'),
            'filters' => $data['filters'],
            'rows' => $data['rows'],
            'totals' => $data['totals'],
        ]);
    }

    protected function getProductSalesData(Shop $shop, Request $request): array
    {
        [$from, $to] = $this->dateRange($request);

        $rows = ProductSale::query()
            ->select([
                'product_id',
                DB::raw('SUM(quantity) as total_qty'),
                DB::raw('SUM(subtotal) as total_amount'),
            ])
            ->whereHas('sale', function ($query) use ($shop, $from, $to) {
                $query->where('shop_id', $shop->id)
                    ->when($from, fn ($q) => $q->whereDate('sale_date', '>=', $from))
                    ->when($to, fn ($q) => $q->whereDate('sale_date', '<=', $to));
            })
            ->groupBy('product_id')
            ->with('product:id,name,price')
            ->get()
            ->map(fn (ProductSale $ps) => [
                'product_id' => $ps->product_id,
                'product_name' => (string) ($ps->product->name ?? ''),
                'unit_price' => (float) ($ps->product->price ?? 0),
                'total_qty' => (int) $ps->total_qty,
                'total_amount' => (float) $ps->total_amount,
            ])
            ->sortByDesc('total_amount')
            ->values();

        return [
            'filters' => ['date_from' => $from, 'date_to' => $to],
            'rows' => $rows,
            'totals' => [
                'count_products' => $rows->count(),
                'sum_qty' => (int) $rows->sum('total_qty'),
                'sum_amount' => (float) $rows->sum('total_amount'),
            ],
        ];
    }

    public function serviceSales(Shop $shop, Request $request): Response
    {
        $data = $this->getServiceSalesData($shop, $request);

        return Inertia::render('reports/service-sales', [
            'shop' => $shop->only('id', 'name'),
            'filters' => $data['filters'],
            'rows' => $data['rows'],
            'totals' => $data['totals'],
        ]);
    }

    protected function getServiceSalesData(Shop $shop, Request $request): array
    {
        [$from, $to] = $this->dateRange($request);

        $rows = ServiceSale::query()
            ->select([
                'service_id',
                DB::raw('SUM(quantity) as total_count'),
                DB::raw('SUM(subtotal) as total_amount'),
            ])
            ->whereHas('sale', function ($query) use ($shop, $from, $to) {
                $query->where('shop_id', $shop->id)
                    ->when($from, fn ($q) => $q->whereDate('sale_date', '>=', $from))
                    ->when($to, fn ($q) => $q->whereDate('sale_date', '<=', $to));
            })
            ->groupBy('service_id')
            ->with('service:id,name,price')
            ->get()
            ->map(fn (ServiceSale $ss) => [
                'service_id' => $ss->service_id,
                'service_name' => (string) ($ss->service->name ?? ''),
                'unit_price' => (float) ($ss->service->price ?? 0),
                'total_count' => (int) $ss->total_count,
                'total_amount' => (float) $ss->total_amount,
            ])
            ->sortByDesc('total_amount')
            ->values();

        return [
            'filters' => ['date_from' => $from, 'date_to' => $to],
            'rows' => $rows,
            'totals' => [
                'count_services' => $rows->count(),
                'sum_count' => (int) $rows->sum('total_count'),
                'sum_amount' => (float) $rows->sum('total_amount'),
            ],
        ];
    }

    public function clients(Shop $shop, Request $request): Response
    {
        $data = $this->getClientsData($shop, $request);

        return Inertia::render('reports/clients', [
            'shop' => $shop->only('id', 'name'),
            'filters' => $data['filters'],
            'rows' => $data['rows'],
            'totals' => $data['totals'],
        ]);
    }

    protected function getClientsData(Shop $shop, Request $request): array
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
            ->groupBy('customer_name')
            ->orderByDesc('total_spent')
            ->get()
            ->map(fn ($row) => [
                'customer_name' => (string) $row->customer_name,
                'orders_count' => (int) $row->orders_count,
                'total_spent' => (float) $row->total_spent,
            ])
            ->values();

        return [
            'filters' => ['date_from' => $from, 'date_to' => $to],
            'rows' => $rows,
            'totals' => [
                'count_clients' => $rows->count(),
                'sum_orders' => (int) $rows->sum('orders_count'),
                'sum_amount' => (float) $rows->sum('total_spent'),
            ],
        ];
    }

    public function hairdressers(Shop $shop, Request $request): Response
    {
        $data = $this->getHairdressersData($shop, $request);

        return Inertia::render('reports/hairdressers', [
            'shop' => $shop->only('id', 'name'),
            'filters' => $data['filters'],
            'rows' => $data['rows'],
            'totals' => $data['totals'],
        ]);
    }

    protected function getHairdressersData(Shop $shop, Request $request): array
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
            ->groupBy('hairdresser_name')
            ->orderByDesc('total_amount')
            ->get()
            ->map(fn ($row) => [
                'hairdresser_name' => (string) $row->hairdresser_name,
                'orders_count' => (int) $row->orders_count,
                'total_amount' => (float) $row->total_amount,
            ])
            ->values();

        return [
            'filters' => ['date_from' => $from, 'date_to' => $to],
            'rows' => $rows,
            'totals' => [
                'count_hairdressers' => $rows->count(),
                'sum_orders' => (int) $rows->sum('orders_count'),
                'sum_amount' => (float) $rows->sum('total_amount'),
            ],
        ];
    }

    /**
     * @return array{0:?string,1:?string}
     */
    protected function dateRange(Request $request): array
    {
        $from = $request->string('date_from')->trim()->toString();
        $to = $request->string('date_to')->trim()->toString();

        return [
            $from !== '' ? $from : null,
            $to !== '' ? $to : null,
        ];
    }
}
