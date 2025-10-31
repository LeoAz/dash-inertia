<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreSaleRequest;
use App\Http\Requests\UpdateSaleRequest;
use App\Models\Hairdresser;
use App\Models\Product;
use App\Models\Promotion;
use App\Models\Sale;
use App\Models\Service;
use App\Models\Shop;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class SaleController extends Controller
{
    public function history(Shop $shop, Request $request): Response
    {
        $q = (string) $request->string('q')->toString();
        $perPage = (int) ($request->integer('perPage') ?: 20);
        $perPage = $perPage > 0 && $perPage <= 100 ? $perPage : 20;

        $sort = (string) $request->string('sort')->toString();
        $dir = strtolower((string) $request->string('dir')->toString());
        $dir = in_array($dir, ['asc', 'desc'], true) ? $dir : 'desc';

        // Allowlist of sortable fields
        $sortable = ['receipt_number', 'sale_date', 'customer_name', 'total_amount', 'hairdresser_name'];
        if (! in_array($sort, $sortable, true)) {
            $sort = 'sale_date';
        }

        $dateFrom = (string) $request->string('date_from')->toString();
        $dateTo = (string) $request->string('date_to')->toString();

        $query = Sale::query()
            ->where('sales.shop_id', $shop->id)
            ->leftJoin('receipts', 'receipts.sale_id', '=', 'sales.id')
            ->with([
                'hairdresser:id,name',
                'receipt',
                'promotion:id,name,percentage,amount,starts_at,ends_at,days_of_week',
                'products',
                'services',
            ])
            ->select('sales.*');

        if ($q !== '') {
            $query->where(function ($sub) use ($q) {
                $sub->where('receipts.receipt_number', 'like', "%{$q}%")
                    ->orWhere('sales.customer_name', 'like', "%{$q}%")
                    ->orWhereHas('hairdresser', function ($h) use ($q) {
                        $h->where('name', 'like', "%{$q}%");
                    });
            });
        }

        if ($dateFrom !== '') {
            $query->whereDate('sales.sale_date', '>=', $dateFrom);
        }
        if ($dateTo !== '') {
            $query->whereDate('sales.sale_date', '<=', $dateTo);
        }

        if ($sort === 'hairdresser_name') {
            $query->leftJoin('hairdressers', 'hairdressers.id', '=', 'sales.hairdresser_id')
                ->select('sales.*')
                ->orderBy('hairdressers.name', $dir)
                ->orderBy('sales.id', 'desc');
        } elseif ($sort === 'receipt_number') {
            $query->orderBy('receipts.receipt_number', $dir)->orderBy('sales.id', 'desc');
        } else {
            $query->orderBy("sales.$sort", $dir)->orderBy('sales.id', 'desc');
        }

        /** @var LengthAwarePaginator $paginator */
        $paginator = $query->paginate($perPage)->appends($request->query());

        $sales = $paginator->through(function (Sale $s) {
            $productItems = $s->relationLoaded('products')
                ? $s->products->map(function ($p) {
                    return [
                        'type' => 'product',
                        'name' => (string) ($p->name ?? ''),
                        'quantity' => (int) ($p->pivot->quantity ?? 1),
                        'unit_price' => (float) ($p->pivot->unit_price ?? $p->price ?? 0),
                        'line_subtotal' => (float) ($p->pivot->subtotal ?? (($p->pivot->unit_price ?? $p->price ?? 0) * max(1, (int) ($p->pivot->quantity ?? 1)))),
                    ];
                })->all()
                : [];

            $serviceItems = $s->relationLoaded('services')
                ? $s->services->map(function ($srv) {
                    return [
                        'type' => 'service',
                        'name' => (string) ($srv->name ?? ''),
                        'price' => (float) ($srv->pivot->unit_price ?? $srv->price ?? 0),
                    ];
                })->all()
                : [];

            $promotion = $s->promotion;
            $promotionLabel = $promotion?->name;
            if (! $promotionLabel && $promotion) {
                $pct = (float) ($promotion->percentage ?? 0);
                $amt = (float) ($promotion->amount ?? 0);
                if ($pct > 0) {
                    $promotionLabel = $pct.'%';
                } elseif ($amt > 0) {
                    $promotionLabel = number_format($amt, 0, ',', ' ').' XOF';
                } else {
                    $promotionLabel = __('Promotion');
                }
            }

            return [
                'id' => $s->id,
                'shop_id' => $s->shop_id,
                'receipt_number' => optional($s->receipt)->receipt_number,
                'customer_name' => $s->customer_name,
                'hairdresser_name' => optional($s->hairdresser)->name,
                'total_amount' => (float) $s->total_amount,
                'sale_date' => optional($s->sale_date)?->toISOString() ?? now()->toISOString(),
                'promotion_applied' => ! is_null($s->promotion_id),
                'promotion_label' => $promotionLabel,
                'details' => array_values(array_merge($productItems, $serviceItems)),
            ];
        });

        return Inertia::render('sales/all-sales', [
            'sales' => $sales,
            'filters' => [
                'q' => $q,
                'sort' => $sort,
                'dir' => $dir,
                'perPage' => $perPage,
                'date_from' => $dateFrom !== '' ? $dateFrom : null,
                'date_to' => $dateTo !== '' ? $dateTo : null,
            ],
            'shop' => [
                'id' => $shop->id,
                'name' => $shop->name,
            ],
        ]);
    }

    public function show(Shop $shop, Sale $sale)
    {
        abort_if((int) $sale->shop_id !== (int) $shop->id, 404);

        $sale->loadMissing(['products' => function ($q) {
            $q->select('products.id');
        }, 'services' => function ($q) {
            $q->select('services.id');
        }]);

        $data = [
            'id' => $sale->id,
            'customer_name' => (string) ($sale->customer_name ?? ''),
            'customer_phone' => (string) ($sale->customer_phone ?? ''),
            'sale_date' => optional($sale->sale_date)?->toDateString(),
            'hairdresser_id' => $sale->hairdresser_id,
            'promotion_id' => $sale->promotion_id,
            'products' => $sale->products->map(fn ($p) => [
                'product_id' => (int) $p->id,
                'quantity' => (int) ($p->pivot->quantity ?? 1),
            ])->values()->all(),
            'services' => $sale->services->map(fn ($s) => [
                'service_id' => (int) $s->id,
            ])->values()->all(),
        ];

        return response()->json($data);
    }

    public function index(Shop $shop, Request $request): Response
    {
        $q = (string) $request->string('q')->toString();
        $perPage = (int) ($request->integer('perPage') ?: 15);
        $perPage = $perPage > 0 && $perPage <= 100 ? $perPage : 15;

        $sort = (string) $request->string('sort')->toString();
        $dir = strtolower((string) $request->string('dir')->toString());
        $dir = in_array($dir, ['asc', 'desc'], true) ? $dir : 'desc';

        // Allowlist of sortable fields
        $sortable = ['receipt_number', 'sale_date', 'customer_name', 'total_amount', 'hairdresser_name'];
        if (! in_array($sort, $sortable, true)) {
            $sort = 'sale_date';
        }

        $query = Sale::query()
            ->where('sales.shop_id', $shop->id)
            ->whereDate('sales.sale_date', today())
            ->leftJoin('receipts', 'receipts.sale_id', '=', 'sales.id')
            ->with([
                'hairdresser:id,name',
                'receipt',
                'promotion:id,name,percentage,amount,starts_at,ends_at,days_of_week',
                'products',
                'services',
            ])
            ->select('sales.*');

        if ($q !== '') {
            $query->where(function ($sub) use ($q) {
                $sub->where('receipts.receipt_number', 'like', "%{$q}%")
                    ->orWhere('sales.customer_name', 'like', "%{$q}%")
                    ->orWhereHas('hairdresser', function ($h) use ($q) {
                        $h->where('name', 'like', "%{$q}%");
                    });
            });
        }

        if ($sort === 'hairdresser_name') {
            // Sort via related table
            $query->leftJoin('hairdressers', 'hairdressers.id', '=', 'sales.hairdresser_id')
                ->select('sales.*')
                ->orderBy('hairdressers.name', $dir)
                ->orderBy('sales.id', 'desc');
        } elseif ($sort === 'receipt_number') {
            $query->orderBy('receipts.receipt_number', $dir)->orderBy('sales.id', 'desc');
        } else {
            $query->orderBy("sales.$sort", $dir)->orderBy('sales.id', 'desc');
        }

        /** @var LengthAwarePaginator $paginator */
        $paginator = $query->paginate($perPage)->appends($request->query());

        $sales = $paginator->through(function (Sale $s) {
            // Build details from related products/services
            $productItems = $s->relationLoaded('products')
                ? $s->products->map(function ($p) {
                    return [
                        'type' => 'product',
                        'name' => (string) ($p->name ?? ''),
                        'quantity' => (int) ($p->pivot->quantity ?? 1),
                        'unit_price' => (float) ($p->pivot->unit_price ?? $p->price ?? 0),
                        'line_subtotal' => (float) ($p->pivot->subtotal ?? (($p->pivot->unit_price ?? $p->price ?? 0) * max(1, (int) ($p->pivot->quantity ?? 1)))),
                    ];
                })->all()
                : [];

            $serviceItems = $s->relationLoaded('services')
                ? $s->services->map(function ($srv) {
                    return [
                        'type' => 'service',
                        'name' => (string) ($srv->name ?? ''),
                        'price' => (float) ($srv->pivot->unit_price ?? $srv->price ?? 0),
                    ];
                })->all()
                : [];

            $promotion = $s->promotion;
            $promotionLabel = $promotion?->name;
            if (! $promotionLabel && $promotion) {
                $pct = (float) ($promotion->percentage ?? 0);
                $amt = (float) ($promotion->amount ?? 0);
                if ($pct > 0) {
                    $promotionLabel = $pct.'%';
                } elseif ($amt > 0) {
                    $promotionLabel = number_format($amt, 0, ',', ' ').' XOF';
                } else {
                    $promotionLabel = __('Promotion');
                }
            }

            return [
                'id' => $s->id,
                'shop_id' => $s->shop_id,
                'receipt_number' => optional($s->receipt)->receipt_number,
                'customer_name' => $s->customer_name,
                'hairdresser_name' => optional($s->hairdresser)->name,
                'total_amount' => (float) $s->total_amount,
                'sale_date' => optional($s->sale_date)?->toISOString() ?? now()->toISOString(),
                'promotion_applied' => ! is_null($s->promotion_id),
                'promotion_label' => $promotionLabel,
                'details' => array_values(array_merge($productItems, $serviceItems)),
            ];
        });

        return Inertia::render('sales/index', [
            'sales' => $sales,
            'filters' => [
                'q' => $q,
                'sort' => $sort,
                'dir' => $dir,
                'perPage' => $perPage,
            ],
            'shop' => [
                'id' => $shop->id,
                'name' => $shop->name,
            ],
            // Data sources for selects in the create/edit form
            'products' => Product::query()
                ->where('shop_id', $shop->id)
                ->orderBy('name')
                ->get(['id', 'name', 'price'])
                ->map(fn ($p) => [
                    'id' => $p->id,
                    'name' => (string) $p->name,
                    'price' => (float) $p->price,
                ]),
            'services' => Service::query()
                ->where('shop_id', $shop->id)
                ->orderBy('name')
                ->get(['id', 'name', 'price'])
                ->map(fn ($s) => [
                    'id' => $s->id,
                    'name' => (string) $s->name,
                    'price' => (float) $s->price,
                ]),
            'promotions' => Promotion::query()
                ->where('shop_id', $shop->id)
                ->orderBy('name')
                ->get(['id', 'name', 'percentage', 'amount', 'applicable_to_products', 'applicable_to_services', 'active', 'starts_at', 'ends_at', 'days_of_week'])
                ->map(fn ($pr) => [
                    'id' => $pr->id,
                    'name' => (string) $pr->name,
                    'percentage' => (float) ($pr->percentage ?? 0),
                    'amount' => (float) ($pr->amount ?? 0),
                    'applicable_to_products' => (bool) $pr->applicable_to_products,
                    'applicable_to_services' => (bool) $pr->applicable_to_services,
                    'active' => (bool) $pr->active,
                    'starts_at' => optional($pr->starts_at)?->toDateString(),
                    'ends_at' => optional($pr->ends_at)?->toDateString(),
                    'days_of_week' => $pr->days_of_week,
                ]),
            'hairdressers' => Hairdresser::query()
                ->where('shop_id', $shop->id)
                ->orderBy('name')
                ->get(['id', 'name'])
                ->map(fn ($h) => [
                    'id' => $h->id,
                    'name' => (string) $h->name,
                ]),
        ]);
    }

    public function store(Shop $shop, StoreSaleRequest $request): RedirectResponse
    {
        $user = $request->user();
        $data = $request->validated();

        return DB::transaction(function () use ($shop, $user, $data) {
            // Normalize items
            $productItems = collect($data['products'] ?? []);
            $serviceItems = collect($data['services'] ?? []);

            // Fetch prices server-side to avoid tampering
            $products = Product::query()
                ->whereIn('id', $productItems->pluck('product_id')->all())
                ->where('shop_id', $shop->id)
                ->get(['id', 'price']);
            $services = Service::query()
                ->whereIn('id', $serviceItems->pluck('service_id')->all())
                ->where('shop_id', $shop->id)
                ->get(['id', 'price']);

            $pivotProducts = [];
            $productsTotal = 0.0;

            // Aggregate requested quantities per product
            $requestedPerProduct = [];

            foreach ($productItems as $row) {
                $pid = (int) $row['product_id'];
                $qty = (int) $row['quantity'];
                $p = $products->firstWhere('id', $pid);
                if (! $p) {
                    continue;
                }
                $unit = (float) $p->price;
                $subtotal = round($unit * $qty, 2);
                $productsTotal += $subtotal;
                $pivotProducts[$pid] = [
                    'quantity' => $qty,
                    'unit_price' => $unit,
                    'subtotal' => $subtotal,
                ];

                $requestedPerProduct[$pid] = ($requestedPerProduct[$pid] ?? 0) + $qty;
            }

            // Validate stock availability and lock rows
            if (! empty($requestedPerProduct)) {
                $lockProducts = Product::query()
                    ->whereIn('id', array_keys($requestedPerProduct))
                    ->where('shop_id', $shop->id)
                    ->lockForUpdate()
                    ->get(['id', 'name', 'quantity']);

                $errors = [];
                foreach ($requestedPerProduct as $pid => $qtyNeeded) {
                    $prod = $lockProducts->firstWhere('id', $pid);
                    if (! $prod) {
                        continue;
                    }
                    $available = (int) $prod->quantity;
                    if ($qtyNeeded > $available) {
                        $errors['products'] = __('La quantité demandée pour ":name" dépasse le stock disponible (:available).', [
                            'name' => (string) ($prod->name ?? 'Produit'),
                            'available' => $available,
                        ]);
                        break;
                    }
                }
                if (! empty($errors)) {
                    throw ValidationException::withMessages($errors);
                }
            }

            $pivotServices = [];
            $servicesTotal = 0.0;
            foreach ($serviceItems as $row) {
                $sid = (int) $row['service_id'];
                $s = $services->firstWhere('id', $sid);
                if (! $s) {
                    continue;
                }
                $unit = (float) $s->price;
                $subtotal = round($unit, 2);
                $servicesTotal += $subtotal;
                $pivotServices[$sid] = [
                    'unit_price' => $unit,
                    'subtotal' => $subtotal,
                ];
            }

            $gross = round($productsTotal + $servicesTotal, 2);

            $sale = new Sale;
            $sale->uuid = (string) Str::uuid();
            $sale->shop_id = $shop->id;
            $sale->user_id = $user?->id;
            $sale->customer_name = (string) $data['customer_name'];
            $sale->customer_phone = (string) $data['customer_phone'];
            $sale->sale_date = $data['sale_date'] ?? now();
            $sale->status = 'En attente';
            $sale->hairdresser_id = $data['hairdresser_id'] ?? null;
            $sale->total_amount = $gross; // will adjust after promotion
            $sale->save();

            if (! empty($pivotProducts)) {
                $sale->products()->attach($pivotProducts);
            }
            if (! empty($pivotServices)) {
                $sale->services()->attach($pivotServices);
            }

            // Deduct stock for requested products (already locked above)
            if (! empty($requestedPerProduct)) {
                foreach ($requestedPerProduct as $pid => $qtyNeeded) {
                    Product::where('id', $pid)
                        ->where('shop_id', $shop->id)
                        ->lockForUpdate()
                        ->decrement('quantity', $qtyNeeded);
                }
            }

            // Apply promotion if provided
            $discount = 0.0;
            if (! empty($data['promotion_id'])) {
                $promotion = Promotion::query()
                    ->where('shop_id', $shop->id)
                    ->find($data['promotion_id']);
                if ($promotion) {
                    // ensure relations loaded for applyPromotion computations
                    $sale->load(['products', 'services', 'shop']);
                    $sale->applyPromotion($promotion);
                    $discount = (float) ($sale->discount_amount ?? 0);
                }
            } else {
                // Clear any auto promotion
                $sale->promotion_id = null;
                $sale->discount_amount = null;
            }

            $sale->total_amount = round(max(0.0, $gross - $discount), 2);
            $sale->save();

            return redirect()
                ->route('shops.sales.index', $shop)
                ->with('success', __('Vente créée avec succès.'));
        });
    }

    public function update(Shop $shop, Sale $sale, UpdateSaleRequest $request): RedirectResponse
    {
        if ((int) $sale->shop_id !== (int) $shop->id) {
            abort(404);
        }

        $data = $request->validated();

        return DB::transaction(function () use ($shop, $sale, $data) {
            // Update basic fields when provided
            if (array_key_exists('customer_name', $data)) {
                $sale->customer_name = (string) $data['customer_name'];
            }
            if (array_key_exists('customer_phone', $data)) {
                $sale->customer_phone = (string) $data['customer_phone'];
            }
            if (array_key_exists('sale_date', $data)) {
                $sale->sale_date = $data['sale_date'];
            }
            if (array_key_exists('hairdresser_id', $data)) {
                $sale->hairdresser_id = $data['hairdresser_id'] ?? null;
            }

            // Items
            $productsTotal = 0.0;
            $servicesTotal = 0.0;

            if (array_key_exists('products', $data)) {
                $productItems = collect($data['products'] ?? []);
                $products = Product::query()
                    ->whereIn('id', $productItems->pluck('product_id')->all())
                    ->where('shop_id', $shop->id)
                    ->get(['id', 'price']);

                // Build new pivot data and new quantity map
                $pivotProducts = [];
                $newQtyMap = [];
                foreach ($productItems as $row) {
                    $pid = (int) $row['product_id'];
                    $qty = (int) $row['quantity'];
                    $p = $products->firstWhere('id', $pid);
                    if (! $p) {
                        continue;
                    }
                    $unit = (float) $p->price;
                    $subtotal = round($unit * $qty, 2);
                    $productsTotal += $subtotal;
                    $pivotProducts[$pid] = [
                        'quantity' => $qty,
                        'unit_price' => $unit,
                        'subtotal' => $subtotal,
                    ];
                    $newQtyMap[$pid] = ($newQtyMap[$pid] ?? 0) + $qty;
                }

                // Existing quantities for this sale
                $existingQtyMap = $sale->products()->pluck('product_sales.quantity', 'products.id')->all();

                // Union of product ids to lock
                $lockIds = array_values(array_unique(array_merge(array_keys($existingQtyMap), array_keys($newQtyMap))));
                if (! empty($lockIds)) {
                    $lockedProducts = Product::query()
                        ->whereIn('id', $lockIds)
                        ->where('shop_id', $shop->id)
                        ->lockForUpdate()
                        ->get(['id', 'name', 'quantity']);

                    // Validate increases and compute adjustments
                    $errors = [];
                    foreach ($lockIds as $pid) {
                        $old = (int) ($existingQtyMap[$pid] ?? 0);
                        $new = (int) ($newQtyMap[$pid] ?? 0);
                        $delta = $new - $old;
                        if ($delta > 0) {
                            $prod = $lockedProducts->firstWhere('id', $pid);
                            $available = (int) ($prod?->quantity ?? 0);
                            if ($delta > $available) {
                                $errors['products'] = __('La quantité demandée pour ":name" dépasse le stock disponible (:available).', [
                                    'name' => (string) ($prod->name ?? 'Produit'),
                                    'available' => $available,
                                ]);
                                break;
                            }
                        }
                    }
                    if (! empty($errors)) {
                        throw ValidationException::withMessages($errors);
                    }

                    // Apply stock adjustments: decrement on increase, increment on decrease/removal
                    foreach ($lockIds as $pid) {
                        $old = (int) ($existingQtyMap[$pid] ?? 0);
                        $new = (int) ($newQtyMap[$pid] ?? 0);
                        $delta = $new - $old;
                        if ($delta > 0) {
                            Product::where('id', $pid)
                                ->where('shop_id', $shop->id)
                                ->lockForUpdate()
                                ->decrement('quantity', $delta);
                        } elseif ($delta < 0) {
                            Product::where('id', $pid)
                                ->where('shop_id', $shop->id)
                                ->lockForUpdate()
                                ->increment('quantity', abs($delta));
                        }
                    }
                }

                // Persist new pivot
                $sale->products()->sync($pivotProducts);
            } else {
                // Recompute current products total if not changed
                $productsTotal = (float) $sale->products()->sum('product_sales.subtotal');
            }

            if (array_key_exists('services', $data)) {
                $serviceItems = collect($data['services'] ?? []);
                $services = Service::query()
                    ->whereIn('id', $serviceItems->pluck('service_id')->all())
                    ->where('shop_id', $shop->id)
                    ->get(['id', 'price']);
                $pivotServices = [];
                foreach ($serviceItems as $row) {
                    $sid = (int) $row['service_id'];
                    $s = $services->firstWhere('id', $sid);
                    if (! $s) {
                        continue;
                    }
                    $unit = (float) $s->price;
                    $subtotal = round($unit, 2);
                    $servicesTotal += $subtotal;
                    $pivotServices[$sid] = [
                        'unit_price' => $unit,
                        'subtotal' => $subtotal,
                    ];
                }
                $sale->services()->sync($pivotServices);
            } else {
                $servicesTotal = (float) $sale->services()->sum('service_sales.subtotal');
            }

            $gross = round($productsTotal + $servicesTotal, 2);

            // Promotion handling
            if (array_key_exists('promotion_id', $data)) {
                if (! empty($data['promotion_id'])) {
                    $promotion = Promotion::query()
                        ->where('shop_id', $shop->id)
                        ->find($data['promotion_id']);
                    $sale->load(['products', 'services', 'shop']);
                    if ($promotion) {
                        $sale->applyPromotion($promotion);
                    } else {
                        $sale->promotion_id = null;
                        $sale->discount_amount = null;
                    }
                } else {
                    $sale->promotion_id = null;
                    $sale->discount_amount = null;
                }
            }

            $discount = (float) ($sale->discount_amount ?? 0);
            $sale->total_amount = round(max(0.0, $gross - $discount), 2);
            $sale->save();

            return redirect()
                ->route('shops.sales.index', $shop)
                ->with('success', __('Vente mise à jour avec succès.'));
        });
    }

    /**
     * Suppression d’une vente + restauration des stocks
     */
    public function destroy(Shop $shop, Sale $sale): RedirectResponse
    {
        abort_if((int) $sale->shop_id !== (int) $shop->id, 404);

        return DB::transaction(function () use ($sale) {
            // 1. Restauration des stocks
            $sale->products()->each(function ($product) {
                $qty = (int) ($product->pivot->quantity ?? 0);
                if ($qty > 0) {
                    Product::query()->where('id', $product->id)
                        ->lockForUpdate()
                        ->increment('quantity', $qty);
                }
            });

            // 2. Dissociation & suppression
            $sale->products()->detach();
            $sale->services()->detach();
            $sale->delete();

            return redirect()->back()->with('success', __('Vente supprimée et stocks restaurés.'));
        });
    }
}
