<?php

namespace App\Http\Controllers;

use App\Http\Requests\StorePromotionRequest;
use App\Http\Requests\UpdatePromotionRequest;
use App\Http\Resources\PromotionResource;
use App\Models\Promotion;
use App\Models\Shop;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;

class PromotionController extends Controller
{
    public function index(Request $request, Shop $shop): InertiaResponse
    {
        $this->authorizeShop($request, $shop);

        $promotions = $shop->promotions()
            ->latest('id')
            ->paginate(perPage: (int) $request->integer('per_page', 10))
            ->withQueryString();

        return Inertia::render('promotions/index', [
            'promotions' => PromotionResource::collection($promotions),
            'shop' => [
                'id' => $shop->id,
                'name' => $shop->name,
            ],
        ]);
    }

    public function create(Request $request, Shop $shop): InertiaResponse
    {
        $this->authorizeShop($request, $shop);

        return Inertia::render('promotions/create', [
            'shop' => [
                'id' => $shop->id,
                'name' => $shop->name,
            ],
        ]);
    }

    public function store(StorePromotionRequest $request, Shop $shop): RedirectResponse
    {
        $this->authorizeShop($request, $shop);

        $payload = $request->validated();
        $payload['shop_id'] = $shop->id;

        $promotion = $shop->promotions()->create($payload);

        return redirect()->route('shops.promotions.index', $shop)
            ->with('success', 'Promotion created successfully.');
    }

    public function edit(Request $request, Shop $shop, Promotion $promotion): InertiaResponse
    {
        $this->authorizeShop($request, $shop);

        return Inertia::render('promotions/edit', [
            'shop' => [
                'id' => $shop->id,
                'name' => $shop->name,
            ],
            'promotion' => PromotionResource::make($promotion),
        ]);
    }

    public function update(UpdatePromotionRequest $request, Shop $shop, Promotion $promotion): RedirectResponse
    {
        $this->authorizeShop($request, $shop);

        $promotion->update($request->validated());

        return redirect()->route('shops.promotions.index', $shop)
            ->with('success', 'Promotion updated successfully.');
    }

    public function destroy(Request $request, Shop $shop, Promotion $promotion): RedirectResponse
    {
        $this->authorizeShop($request, $shop);

        $promotion->delete();

        return redirect()->route('shops.promotions.index', $shop)
            ->with('success', 'Promotion deleted successfully.');
    }

    protected function authorizeShop(Request $request, Shop $shop): void
    {
        $user = $request->user();
        if ($user?->hasRole('Super admin')) {
            // Super admin can access all shops
            return;
        }

        // Admins must be attached to the shop to access
        $isAdmin = $user?->hasRole('admin') ?? false;
        $isAttached = $user?->shops()->whereKey($shop->id)->exists() ?? false;

        abort_unless($isAdmin && $isAttached, 403);
    }
}
