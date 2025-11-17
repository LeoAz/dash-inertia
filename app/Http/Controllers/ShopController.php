<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreShopRequest;
use App\Http\Requests\UpdateShopRequest;
use App\Http\Resources\ShopResource;
use App\Models\Shop;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;

class ShopController extends Controller
{
    public function index(Request $request): InertiaResponse
    {
        $user = $request->user();
        $isSuper = $user?->hasRole('Super admin') ?? false;
        $isAdmin = $user?->hasRole('admin') ?? false;

        // Only Super admin or Admin can access the shop listing
        abort_unless($isSuper || $isAdmin, 403);

        $query = Shop::query();

        // Admins only see shops assigned to them
        if (! $isSuper && $isAdmin) {
            $ids = $user?->shops()->pluck('shops.id')->all() ?? [];
            $query->whereIn('id', $ids);
        }

        $search = trim((string) $request->input('search', ''));
        if ($search !== '') {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('address', 'like', "%{$search}%")
                    ->orWhere('phone', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%");
            });
        }

        $shops = $query
            ->latest('id')
            ->paginate(perPage: (int) $request->integer('per_page', 10))
            ->withQueryString();

        return Inertia::render('shop/index', [
            'shops' => ShopResource::collection($shops),
            'filters' => [
                'search' => $search !== '' ? $search : null,
            ],
        ]);
    }

    public function create(Request $request): InertiaResponse
    {
        return Inertia::render('shop/create');
    }

    public function store(StoreShopRequest $request): RedirectResponse
    {
        Shop::query()->create($request->validated());

        return redirect()->route('admin.shops.index')
            ->with('success', 'Shop created successfully.');
    }

    public function show(Request $request, Shop $shop): InertiaResponse
    {
        return Inertia::render('shop/show', [
            'shop' => ShopResource::make($shop),
        ]);
    }

    public function edit(Request $request, Shop $shop): InertiaResponse
    {
        return Inertia::render('shop/edit', [
            'shop' => ShopResource::make($shop),
        ]);
    }

    public function update(UpdateShopRequest $request, Shop $shop): RedirectResponse
    {
        $shop->update($request->validated());

        return redirect()->route('admin.shops.index')
            ->with('success', 'Shop updated successfully.');
    }

    public function destroy(Request $request, Shop $shop): RedirectResponse
    {
        $user = $request->user();
        abort_unless($user?->hasRole('Super admin'), 403);

        $shop->delete();

        return redirect()->route('admin.shops.index')
            ->with('success', 'Shop deleted successfully.');
    }
}
