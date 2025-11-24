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

it('redirects super admin to admin users index', function () {
    $user = userWithRole('Super admin');

    $this->actingAs($user)
        ->get(route('home'))
        ->assertRedirect(route('admin.users.index'));
});

it('redirects admin to admin shops index', function () {
    $user = userWithRole('admin');

    $this->actingAs($user)
        ->get(route('home'))
        ->assertRedirect(route('admin.shops.index'));
});

it('redirects vendor to first shop dashboard', function () {
    $user = userWithRole('vendeur');
    $shopA = Shop::factory()->create();
    $shopB = Shop::factory()->create();
    // Attach in reverse order to ensure ordering by shops.id is respected
    $user->shops()->sync([$shopB->id, $shopA->id]);

    $this->actingAs($user)
        ->get(route('home'))
        ->assertRedirect(route('shops.dashboard', ['shop' => min($shopA->id, $shopB->id)]));
});

it('redirects authenticated non-admin without shops to default dashboard', function () {
    $user = userWithRole('vendeur');
    // Ensure this vendor has no shops (UserFactory attaches by default)
    $user->shops()->sync([]);

    $this->actingAs($user)
        ->get(route('home'))
        ->assertRedirect(route('dashboard'));
});
