<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreHairdresserRequest;
use App\Http\Requests\UpdateHairdresserRequest;
use App\Http\Resources\HairdresserResource;
use App\Models\Hairdresser;
use App\Models\Shop;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;

class HairdresserController extends Controller
{
    public function index(Request $request, Shop $shop): InertiaResponse
    {
        $this->authorizeShop($request, $shop);

        $hairdressers = $shop->hairdressers()
            ->latest('id')
            ->paginate(perPage: (int) $request->integer('per_page', 10))
            ->withQueryString();

        return Inertia::render('hairdressers/index', [
            'hairdressers' => HairdresserResource::collection($hairdressers),
            'shop' => [
                'id' => $shop->id,
                'name' => $shop->name,
            ],
        ]);
    }

    public function create(Request $request, Shop $shop): InertiaResponse
    {
        $this->authorizeShop($request, $shop);

        return Inertia::render('hairdressers/create', [
            'shop' => [
                'id' => $shop->id,
                'name' => $shop->name,
            ],
        ]);
    }

    public function store(StoreHairdresserRequest $request, Shop $shop): RedirectResponse
    {
        $this->authorizeShop($request, $shop);

        $payload = $request->validated();
        $payload['shop_id'] = $shop->id;

        $shop->hairdressers()->create($payload);

        return redirect()->route('shops.hairdressers.index', $shop)
            ->with('success', 'Coiffeur créé avec succès.');
    }

    public function show(Request $request, Shop $shop, Hairdresser $hairdresser): InertiaResponse
    {
        $this->authorizeShop($request, $shop);

        return Inertia::render('hairdressers/show', [
            'shop' => [
                'id' => $shop->id,
                'name' => $shop->name,
            ],
            'hairdresser' => HairdresserResource::make($hairdresser),
        ]);
    }

    public function edit(Request $request, Shop $shop, Hairdresser $hairdresser): InertiaResponse
    {
        $this->authorizeShop($request, $shop);

        return Inertia::render('hairdressers/edit', [
            'shop' => [
                'id' => $shop->id,
                'name' => $shop->name,
            ],
            'hairdresser' => HairdresserResource::make($hairdresser),
        ]);
    }

    public function update(UpdateHairdresserRequest $request, Shop $shop, Hairdresser $hairdresser): RedirectResponse
    {
        $this->authorizeShop($request, $shop);

        $hairdresser->update($request->validated());

        return redirect()->route('shops.hairdressers.index', $shop)
            ->with('success', 'Coiffeur mis à jour avec succès.');
    }

    public function destroy(Request $request, Shop $shop, Hairdresser $hairdresser): RedirectResponse
    {
        $this->authorizeShop($request, $shop);

        $hairdresser->delete();

        return redirect()->route('shops.hairdressers.index', $shop)
            ->with('success', 'Coiffeur supprimé avec succès.');
    }

    protected function authorizeShop(Request $request, Shop $shop): void
    {
        $hasAccess = $request->user()?->shops()->whereKey($shop->id)->exists() ?? false;

        abort_unless($hasAccess, 403);
    }
}
