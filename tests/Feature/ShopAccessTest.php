<?php

use App\Models\Hairdresser;
use App\Models\Product;
use App\Models\Promotion;
use App\Models\Sale;
use App\Models\Service;
use App\Models\Shop;
use App\Models\User;
use Spatie\Permission\Models\Role;

/**
 * The user factory attaches random shops: reset them so each test states its own access.
 *
 * @param  array<int, Shop>  $shops
 */
function userWithAccess(string $role, array $shops = []): User
{
    $user = User::factory()->create();
    $user->assignRole(Role::findOrCreate($role));
    $user->shops()->sync(collect($shops)->pluck('id')->all());

    return $user;
}

it('refuses shop pages to a user who is not attached to the shop', function (string $routeName) {
    $shop = Shop::factory()->create();

    $this->actingAs(userWithAccess('vendeur'))
        ->get(route($routeName, $shop))
        ->assertForbidden();
})->with([
    'shops.shop-menu',
    'shops.dashboard',
    'shops.sales.index',
    'shops.sales.history',
    'shops.sales.client-suggestions',
    'shops.reports.products',
    'shops.reports.services',
    'shops.reports.clients',
    'shops.reports.hairdressers',
]);

it('refuses the sale details and receipt QR code of another shop', function (string $routeName) {
    $sale = Sale::factory()->for(Shop::factory())->create();

    $this->actingAs(userWithAccess('admin', [Shop::factory()->create()]))
        ->get(route($routeName, [$sale->shop_id, $sale]))
        ->assertForbidden();
})->with(['shops.sales.show', 'shops.sales.qr']);

it('refuses to record a sale in a shop the user is not attached to', function () {
    $shop = Shop::factory()->create();
    $service = Service::factory()->for($shop)->create();

    $this->actingAs(userWithAccess('vendeur'))
        ->post(route('shops.sales.store', $shop), [
            'customer_name' => 'Client',
            'customer_phone' => '70000000',
            'sale_date' => now()->toDateTimeString(),
            'payment_method' => 'caisse',
            'services' => [['service_id' => $service->id, 'quantity' => 1]],
        ])
        ->assertForbidden();

    expect(Sale::query()->count())->toBe(0);
});

it('lets an attached user open the sales of the shop', function () {
    $shop = Shop::factory()->create();

    $this->actingAs(userWithAccess('vendeur', [$shop]))
        ->get(route('shops.sales.index', $shop))
        ->assertOk();
});

it('lets a Super admin open any shop without being attached', function () {
    $shop = Shop::factory()->create();

    $this->actingAs(userWithAccess('Super admin'))
        ->get(route('shops.sales.index', $shop))
        ->assertOk();
});

it('does not reach a record of another shop through the URL of an attached shop', function (string $model, string $routeName) {
    $ownShop = Shop::factory()->create();
    $record = $model::factory()->for(Shop::factory())->create();

    $this->actingAs(userWithAccess('admin', [$ownShop]))
        ->delete(route($routeName, [$ownShop, $record]))
        ->assertNotFound();

    expect($model::query()->whereKey($record->id)->exists())->toBeTrue();
})->with([
    [Product::class, 'shops.products.destroy'],
    [Service::class, 'shops.services.destroy'],
    [Hairdresser::class, 'shops.hairdressers.destroy'],
    [Promotion::class, 'shops.promotions.destroy'],
]);

it('refuses shop creation to anyone but a Super admin', function () {
    $this->actingAs(userWithAccess('admin'))
        ->post(route('admin.shops.store'), ['name' => 'Boutique pirate'])
        ->assertForbidden();

    expect(Shop::query()->where('name', 'Boutique pirate')->exists())->toBeFalse();
});

it('refuses shop management to a seller, even when attached', function () {
    $shop = Shop::factory()->create(['name' => 'Avant']);

    $this->actingAs(userWithAccess('vendeur', [$shop]))
        ->put(route('admin.shops.update', $shop), ['name' => 'Après'])
        ->assertForbidden();

    expect($shop->refresh()->name)->toBe('Avant');
});

it('refuses shop management to an admin who is not attached', function (string $routeName) {
    $shop = Shop::factory()->create();

    $this->actingAs(userWithAccess('admin'))
        ->get(route($routeName, $shop))
        ->assertForbidden();
})->with(['admin.shops.show', 'admin.shops.edit']);

it('lets an attached admin update the shop', function () {
    $shop = Shop::factory()->create(['name' => 'Avant']);

    $this->actingAs(userWithAccess('admin', [$shop]))
        ->put(route('admin.shops.update', $shop), ['name' => 'Après'])
        ->assertRedirect(route('admin.shops.index'));

    expect($shop->refresh()->name)->toBe('Après');
});
