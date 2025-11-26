<?php

use App\Models\Shop;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;

uses(RefreshDatabase::class);

function userWithRole(string $role): User
{
    $user = User::factory()->create(['email_verified_at' => now()]);
    Role::findOrCreate($role);
    $user->assignRole($role);

    return $user;
}

it('redirects guest to login', function () {
    $this->get(route('home'))->assertRedirect(route('login'));
});

it('redirects super admin to home menu', function () {
    $user = userWithRole('Super admin');

    $this->actingAs($user)
        ->get(route('home'))
        ->assertRedirect(route('home.menu'));
});

it('redirects admin to home menu', function () {
    $user = userWithRole('admin');

    $this->actingAs($user)
        ->get(route('home'))
        ->assertRedirect(route('home.menu'));
});

it('redirects vendor to shop-scoped shop menu', function () {
    $user = userWithRole('vendeur');
    // Create a couple of shops and attach to the user
    $shopA = Shop::factory()->create();
    $shopB = Shop::factory()->create();
    // Attach in reverse order to ensure ordering by shops.id is respected
    $user->shops()->sync([$shopB->id, $shopA->id]);

    $firstId = min($shopA->id, $shopB->id);

    $this->actingAs($user)
        ->get(route('home'))
        ->assertRedirect(route('shops.shop-menu', ['shop' => $firstId]));
});

it('redirects authenticated non-admin without shops to no-shop page', function () {
    $user = userWithRole('vendeur');
    // Ensure this vendor has no shops (UserFactory attaches by default)
    $user->shops()->sync([]);

    $this->actingAs($user)
        ->get(route('home'))
        ->assertRedirect(route('no-shop'));
});
