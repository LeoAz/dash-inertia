<?php

use App\Models\Shop;
use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Spatie\Permission\Models\Role;

it('redirects admin to admin.shops.index after login', function () {
    // Ensure roles exist
    Role::findOrCreate('admin');

    $user = User::factory()->create([
        'username' => 'admin-user',
        'password' => Hash::make('password'),
    ]);
    $user->assignRole('admin');

    $response = $this->post(route('login.store'), [
        'username' => 'admin-user',
        'password' => 'password',
    ]);

    $response->assertRedirect(route('admin.shops.index', absolute: false));
});

it('redirects super admin to admin.shops.index after login', function () {
    Role::findOrCreate('Super admin');

    $user = User::factory()->create([
        'username' => 'super-user',
        'password' => Hash::make('password'),
    ]);
    $user->assignRole('Super admin');

    $response = $this->post(route('login.store'), [
        'username' => 'super-user',
        'password' => 'password',
    ]);

    $response->assertRedirect(route('admin.shops.index', absolute: false));
});

it('redirects vendeur to first shop sales index after login', function () {
    Role::findOrCreate('vendeur');

    $shopA = Shop::factory()->create();
    $shopB = Shop::factory()->create();

    $user = User::factory()->create([
        'username' => 'vendor-user',
        'password' => Hash::make('password'),
    ]);
    $user->assignRole('vendeur');

    // Attach in a known order so first() is deterministic
    $user->shops()->sync([$shopA->id, $shopB->id]);

    $response = $this->post(route('login.store'), [
        'username' => 'vendor-user',
        'password' => 'password',
    ]);

    $response->assertRedirect(route('shops.sales.index', ['shop' => $shopA->id], absolute: false));
});

it('prevents vendeur without shop from logging in and shows an error', function () {
    Role::findOrCreate('vendeur');

    $user = User::factory()->create([
        'username' => 'vendor-noshop',
        'password' => Hash::make('password'),
    ]);
    $user->assignRole('vendeur');

    // Ensure vendor has no shops linked
    $user->shops()->sync([]);

    $response = $this->from(route('login'))->post(route('login.store'), [
        'username' => 'vendor-noshop',
        'password' => 'password',
    ]);

    // Should redirect back to login with validation errors on username
    $response->assertRedirect(route('login', absolute: false));
    $response->assertSessionHasErrors('username');
    $this->assertGuest();
});
