<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreSaleRequest;
use App\Http\Requests\UpdateSaleRequest;
use App\Models\Hairdresser;
use App\Models\Product;
use App\Models\Promotion;
use App\Models\Receipt;
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
                    })
                    ->orWhereHas('products', function ($p) use ($q) {
                        // match on product name
                        $p->where('products.name', 'like', "%{$q}%");
                    })
                    ->orWhereHas('services', function ($s) use ($q) {
                        // match on service name
                        $s->where('services.name', 'like', "%{$q}%");
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

        $sales = $paginator->through(function (Sale $s) use ($request) {
            return (new \App\Http\Resources\SaleResource($s))->toArray($request);
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
            'sale_date' => optional($sale->sale_date)?->toISOString(),
            'hairdresser_id' => $sale->hairdresser_id,
            'payment_method' => $sale->payment_method,
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

    /**
     * Suggestions for client autocompletion (name and phone) scoped to a shop.
     */
    public function clientSuggestions(Shop $shop, Request $request)
    {
        $q = trim((string) $request->string('q')->toString());
        $limit = (int) ($request->integer('limit') ?: 10);
        $limit = $limit > 0 && $limit <= 50 ? $limit : 10;

        // Build base query: most recent sales first, select only the 2 fields
        $base = Sale::query()
            ->where('sales.shop_id', $shop->id)
            ->select(['customer_name', 'customer_phone'])
            ->orderByDesc('id');

        if ($q !== '') {
            $base->where(function ($sub) use ($q) {
                $sub->where('customer_name', 'like', "%{$q}%")
                    ->orWhere('customer_phone', 'like', "%{$q}%");
            });
        }

        // We cannot distinct on both columns portably with order by, so fetch a reasonable window and then unique in PHP
        $rows = $base->limit(200)->get();

        $seen = [];
        $out = [];
        foreach ($rows as $row) {
            $name = (string) ($row->customer_name ?? '');
            $phone = (string) ($row->customer_phone ?? '');
            if ($name === '' && $phone === '') {
                continue;
            }
            $key = strtolower($name).'|'.preg_replace('/\D+/', '', $phone);
            if (isset($seen[$key])) {
                continue;
            }
            $seen[$key] = true;
            $out[] = [
                'name' => $name,
                'phone' => $phone,
            ];
            if (count($out) >= $limit) {
                break;
            }
        }

        return response()->json($out);
    }

    public function index(Shop $shop, Request $request): Response
    {
        $q = (string) $request->string('q')->toString();
        $sort = (string) $request->string('sort')->toString();
        $dir = strtolower((string) $request->string('dir')->toString());
        $dir = in_array($dir, ['asc', 'desc'], true) ? $dir : 'desc';
        $dateParam = $request->string('date')->toString();
        $isUserAdmin = $request->user()?->hasRole('admin') || $request->user()?->hasRole('Super admin');

        $date = ($isUserAdmin && $dateParam) ? $dateParam : today()->toDateString();

        // Allowlist of sortable fields
        $sortable = ['receipt_number', 'sale_date', 'customer_name', 'total_amount', 'hairdresser_name'];
        if (! in_array($sort, $sortable, true)) {
            $sort = 'sale_date';
        }

        $query = Sale::query()
            ->where('sales.shop_id', $shop->id)
            ->whereDate('sales.sale_date', $date)
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

        $sales = $query->get()->map(function (Sale $s) use ($request) {
            return (new \App\Http\Resources\SaleResource($s))->toArray($request);
        });

        // Totals for today/selected date considering current search query
        $statsQuery = Sale::query()
            ->where('sales.shop_id', $shop->id)
            ->whereDate('sales.sale_date', $date);

        if ($q !== '') {
            $statsQuery->where(function ($sub) use ($q) {
                $sub->whereHas('receipt', function ($r) use ($q) {
                    $r->where('receipt_number', 'like', "%{$q}%");
                })
                    ->orWhere('sales.customer_name', 'like', "%{$q}%")
                    ->orWhereHas('hairdresser', function ($h) use ($q) {
                        $h->where('name', 'like', "%{$q}%");
                    });
            });
        }

        $dailyTotals = (clone $statsQuery)->select([
            DB::raw('SUM(total_amount) as total_vendu'),
            DB::raw('COUNT(*) as total_ventes'),
            DB::raw("SUM(CASE WHEN payment_method = 'caisse' THEN total_amount ELSE 0 END) as total_caisse"),
            DB::raw("SUM(CASE WHEN payment_method = 'orange_money' THEN total_amount ELSE 0 END) as total_orange_money"),
        ])->first();

        $totalProduits = DB::table('product_sales')
            ->join('sales', 'sales.id', '=', 'product_sales.sale_id')
            ->where('sales.shop_id', $shop->id)
            ->whereDate('sales.sale_date', $date)
            ->when($q !== '', function ($query) use ($q) {
                $query->where(function ($sub) use ($q) {
                    $sub->whereExists(function ($query) use ($q) {
                        $query->select(DB::raw(1))
                            ->from('receipts')
                            ->whereColumn('receipts.sale_id', 'sales.id')
                            ->where('receipt_number', 'like', "%{$q}%");
                    })
                        ->orWhere('sales.customer_name', 'like', "%{$q}%")
                        ->orWhereExists(function ($query) use ($q) {
                            $query->select(DB::raw(1))
                                ->from('hairdressers')
                                ->whereColumn('hairdressers.id', 'sales.hairdresser_id')
                                ->where('name', 'like', "%{$q}%");
                        });
                });
            })
            ->sum('product_sales.subtotal');

        $totalServices = DB::table('service_sales')
            ->join('sales', 'sales.id', '=', 'service_sales.sale_id')
            ->where('sales.shop_id', $shop->id)
            ->whereDate('sales.sale_date', $date)
            ->when($q !== '', function ($query) use ($q) {
                $query->where(function ($sub) use ($q) {
                    $sub->whereExists(function ($query) use ($q) {
                        $query->select(DB::raw(1))
                            ->from('receipts')
                            ->whereColumn('receipts.sale_id', 'sales.id')
                            ->where('receipt_number', 'like', "%{$q}%");
                    })
                        ->orWhere('sales.customer_name', 'like', "%{$q}%")
                        ->orWhereExists(function ($query) use ($q) {
                            $query->select(DB::raw(1))
                                ->from('hairdressers')
                                ->whereColumn('hairdressers.id', 'sales.hairdresser_id')
                                ->where('name', 'like', "%{$q}%");
                        });
                });
            })
            ->sum('service_sales.subtotal');

        return Inertia::render('sales/index', [
            'sales' => $sales,
            'daily_stats' => [
                'total_vendu' => (float) ($dailyTotals->total_vendu ?? 0),
                'total_ventes' => (int) ($dailyTotals->total_ventes ?? 0),
                'total_caisse' => (float) ($dailyTotals->total_caisse ?? 0),
                'total_orange_money' => (float) ($dailyTotals->total_orange_money ?? 0),
                'total_produits' => (float) ($totalProduits ?? 0),
                'total_services' => (float) ($totalServices ?? 0),
            ],
            'filters' => [
                'q' => $q,
                'sort' => $sort,
                'dir' => $dir,
                'date' => $date,
            ],
            'shop' => [
                'id' => $shop->id,
                'name' => $shop->name,
            ],
            'can_filter_by_date' => $isUserAdmin,
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
                $qty = (int) ($row['quantity'] ?? 1);
                $s = $services->firstWhere('id', $sid);
                if (! $s) {
                    continue;
                }
                $unit = (float) $s->price;
                $subtotal = round($unit * $qty, 2);
                $servicesTotal += $subtotal;
                $pivotServices[$sid] = [
                    'quantity' => $qty,
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
            // Payment method is required via validation
            $sale->payment_method = $data['payment_method'];
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

            // Ensure a receipt exists for this sale
            if (! $sale->receipt) {
                // Generate a unique receipt number with retry in the unlikely event of collision
                $maxAttempts = 5;
                $attempt = 0;
                $receiptNumber = null;
                do {
                    $attempt++;
                    $prefix = 'RC';
                    $datePart = now()->format('Ymd');
                    $shopPart = str_pad((string) $shop->id, 2, '0', STR_PAD_LEFT);
                    $random = Str::upper(Str::random(5));
                    $candidate = sprintf('%s-%s-%s-%s', $prefix, $datePart, $shopPart, $random);

                    $exists = Receipt::query()->where('receipt_number', $candidate)->exists();
                    if (! $exists) {
                        $receiptNumber = $candidate;
                        break;
                    }
                } while ($attempt < $maxAttempts);

                $receipt = new Receipt;
                $receipt->sale_id = $sale->id;
                $receipt->shop_id = $shop->id;
                $receipt->receipt_number = $receiptNumber ?? (string) Str::uuid();
                $receipt->generated_by = $user?->id;
                $receipt->generated_at = now();
                $receipt->save();
            }

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

        $user = $request->user();
        $isSuper = $user?->hasRole('Super admin') ?? false;
        $isAdmin = ($user?->hasRole('admin') ?? false) && ($user?->shops()->whereKey($shop->id)->exists() ?? false);
        abort_unless($isSuper || $isAdmin, 403);

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
            if (array_key_exists('payment_method', $data)) {
                $sale->payment_method = $data['payment_method'];
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
                    $qty = (int) ($row['quantity'] ?? 1);
                    $s = $services->firstWhere('id', $sid);
                    if (! $s) {
                        continue;
                    }
                    $unit = (float) $s->price;
                    $subtotal = round($unit * $qty, 2);
                    $servicesTotal += $subtotal;
                    $pivotServices[$sid] = [
                        'quantity' => $qty,
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
    public function destroy(Shop $shop, Sale $sale, Request $request): RedirectResponse
    {
        abort_if((int) $sale->shop_id !== (int) $shop->id, 404);

        $user = $request->user();
        $isSuper = $user?->hasRole('Super admin') ?? false;
        $isAdmin = ($user?->hasRole('admin') ?? false) && ($user?->shops()->whereKey($shop->id)->exists() ?? false);
        abort_unless($isSuper || $isAdmin, 403);

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
