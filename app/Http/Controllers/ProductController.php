<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreProductRequest;
use App\Http\Requests\UpdateProductRequest;
use App\Http\Resources\ProductResource;
use App\Models\Product;
use App\Models\Shop;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;

class ProductController extends Controller
{
    public function index(Request $request, Shop $shop): InertiaResponse
    {
        // Ensure the authenticated user has access to this shop
        $this->authorizeShop($request, $shop);

        $products = $shop->products()
            ->latest('id')
            ->paginate(perPage: (int) $request->integer('per_page', 10))
            ->withQueryString();

        return Inertia::render('products/index', [
            'products' => ProductResource::collection($products),
            'shop' => [
                'id' => $shop->id,
                'name' => $shop->name,
            ],
        ]);
    }

    public function create(Request $request, Shop $shop): InertiaResponse
    {
        $this->authorizeShop($request, $shop);

        return Inertia::render('products/create', [
            'shop' => [
                'id' => $shop->id,
                'name' => $shop->name,
            ],
        ]);
    }

    public function store(StoreProductRequest $request, Shop $shop): RedirectResponse
    {
        $this->authorizeShop($request, $shop);

        $payload = $request->validated();
        $payload['shop_id'] = $shop->id;

        $product = $shop->products()->create($payload);

        return redirect()->route('shops.products.index', $shop)
            ->with('success', 'Product created successfully.');
    }

    public function show(Request $request, Shop $shop, Product $product): InertiaResponse
    {
        $this->authorizeShop($request, $shop);

        return Inertia::render('products/show', [
            'shop' => [
                'id' => $shop->id,
                'name' => $shop->name,
            ],
            'product' => ProductResource::make($product),
        ]);
    }

    public function edit(Request $request, Shop $shop, Product $product): InertiaResponse
    {
        $this->authorizeShop($request, $shop);

        return Inertia::render('products/edit', [
            'shop' => [
                'id' => $shop->id,
                'name' => $shop->name,
            ],
            'product' => ProductResource::make($product),
        ]);
    }

    public function update(UpdateProductRequest $request, Shop $shop, Product $product): RedirectResponse
    {
        $this->authorizeShop($request, $shop);

        $product->update($request->validated());

        return redirect()->route('shops.products.index', $shop)
            ->with('success', 'Product updated successfully.');
    }

    public function destroy(Request $request, Shop $shop, Product $product): RedirectResponse
    {
        $this->authorizeShop($request, $shop);

        $product->delete();

        return redirect()->route('shops.products.index', $shop)
            ->with('success', 'Product deleted successfully.');
    }

    protected function authorizeShop(Request $request, Shop $shop): void
    {
        $hasAccess = $request->user()?->shops()->whereKey($shop->id)->exists() ?? false;

        abort_unless($hasAccess, 403);
    }
}
