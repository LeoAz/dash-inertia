<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreServiceRequest;
use App\Http\Requests\UpdateServiceRequest;
use App\Http\Resources\ServiceResource;
use App\Models\Service;
use App\Models\Shop;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;

class ServiceController extends Controller
{
    public function index(Request $request, Shop $shop): InertiaResponse
    {
        $this->authorizeShop($request, $shop);

        $services = $shop->services()
            ->latest('id')
            ->paginate(perPage: (int) $request->integer('per_page', 10))
            ->withQueryString();

        return Inertia::render('services/index', [
            'services' => ServiceResource::collection($services),
            'shop' => [
                'id' => $shop->id,
                'name' => $shop->name,
            ],
        ]);
    }

    public function create(Request $request, Shop $shop): InertiaResponse
    {
        $this->authorizeShop($request, $shop);

        return Inertia::render('services/create', [
            'shop' => [
                'id' => $shop->id,
                'name' => $shop->name,
            ],
        ]);
    }

    public function store(StoreServiceRequest $request, Shop $shop): RedirectResponse
    {
        $this->authorizeShop($request, $shop);

        $payload = $request->validated();
        $payload['shop_id'] = $shop->id;

        $service = $shop->services()->create($payload);

        return redirect()->route('shops.services.index', $shop)
            ->with('success', 'Service created successfully.');
    }

    public function show(Request $request, Shop $shop, Service $service): InertiaResponse
    {
        $this->authorizeShop($request, $shop);

        return Inertia::render('services/show', [
            'shop' => [
                'id' => $shop->id,
                'name' => $shop->name,
            ],
            'service' => ServiceResource::make($service),
        ]);
    }

    public function edit(Request $request, Shop $shop, Service $service): InertiaResponse
    {
        $this->authorizeShop($request, $shop);

        return Inertia::render('services/edit', [
            'shop' => [
                'id' => $shop->id,
                'name' => $shop->name,
            ],
            'service' => ServiceResource::make($service),
        ]);
    }

    public function update(UpdateServiceRequest $request, Shop $shop, Service $service): RedirectResponse
    {
        $this->authorizeShop($request, $shop);

        $service->update($request->validated());

        return redirect()->route('shops.services.index', $shop)
            ->with('success', 'Service updated successfully.');
    }

    public function destroy(Request $request, Shop $shop, Service $service): RedirectResponse
    {
        $this->authorizeShop($request, $shop);

        $service->delete();

        return redirect()->route('shops.services.index', $shop)
            ->with('success', 'Service deleted successfully.');
    }

    protected function authorizeShop(Request $request, Shop $shop): void
    {
        $hasAccess = $request->user()?->shops()->whereKey($shop->id)->exists() ?? false;

        abort_unless($hasAccess, 403);
    }
}
