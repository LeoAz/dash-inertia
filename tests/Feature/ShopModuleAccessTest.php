<?php

use App\Models\Shop;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;

uses(RefreshDatabase::class);

function makeUserWithRole(string $roleName, bool $attachShop = false, ?Shop $shop = null): User
{
    $user = User::factory()->create(['email_verified_at' => now()]);
    Role::findOrCreate($roleName);
    $user->assignRole($roleName);

    if ($attachShop && $shop !== null) {
        $user->shops()->sync([$shop->id]);
    } else {
        // Ensure the user has no attached shops for negative access tests
        $user->shops()->sync([]);
    }

    test()->actingAs($user);

    return $user;
}

/**
 * @return array<int, string>
 */
function shopModules(): array
{
    return [
        'shops.services.index',
        'shops.hairdressers.index',
        'shops.promotions.index',
    ];
}

it('allows Super admin to access all shop modules', function (string $routeName) {
    $shop = Shop::factory()->create();
    makeUserWithRole('Super admin');

    $this->get(route($routeName, $shop))->assertSuccessful();
})->with(shopModules());

it('allows admin attached to the shop to access modules', function (string $routeName) {
    $shop = Shop::factory()->create();
    makeUserWithRole('admin', attachShop: true, shop: $shop);

    $this->get(route($routeName, $shop))->assertSuccessful();
})->with(shopModules());

it('forbids admin not attached to the shop', function (string $routeName) {
    $shop = Shop::factory()->create();
    makeUserWithRole('admin'); // not attached to $shop

    $this->get(route($routeName, $shop))->assertForbidden();
})->with(shopModules());

it('forbids vendeur even if attached to the shop', function (string $routeName) {
    $shop = Shop::factory()->create();
    makeUserWithRole('vendeur', attachShop: true, shop: $shop);

    $this->get(route($routeName, $shop))->assertForbidden();
})->with(shopModules());
