<?php

use App\Models\Shop;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

it('displays the shops index', function () {
    $user = User::factory()->create(['email_verified_at' => now()]);

    $this->actingAs($user);

    $response = $this->get(route('admin.shops.index'));

    $response->assertSuccessful();
});

it('validates when creating a shop', function () {
    $user = User::factory()->create(['email_verified_at' => now()]);

    $this->actingAs($user);

    $response = $this->post(route('admin.shops.store'), [
        // Missing name
        'address' => '1 rue Test',
    ]);

    $response->assertSessionHasErrors(['name']);
});

it('creates a shop and redirects', function () {
    $user = User::factory()->create(['email_verified_at' => now()]);

    $this->actingAs($user);

    $payload = [
        'name' => 'Nouvelle Boutique',
        'address' => '1 rue Test',
        'phone' => '0600000000',
        'email' => 'shop@example.com',
    ];

    $response = $this->post(route('admin.shops.store'), $payload);

    $response->assertRedirect(route('admin.shops.index'));

    $this->assertDatabaseHas('shops', [
        'name' => 'Nouvelle Boutique',
        'address' => '1 rue Test',
        'phone' => '0600000000',
        'email' => 'shop@example.com',
    ]);
});

it('updates a shop and redirects', function () {
    $user = User::factory()->create();
    $shop = Shop::factory()->create([
        'name' => 'Ancien nom',
        'email' => 'old@example.com',
    ]);

    $this->actingAs($user);

    $response = $this->put(route('admin.shops.update', $shop), [
        'name' => 'Nouveau nom',
        'email' => 'new@example.com',
    ]);

    $response->assertRedirect(route('admin.shops.index'));

    $this->assertDatabaseHas('shops', [
        'id' => $shop->id,
        'name' => 'Nouveau nom',
        'email' => 'new@example.com',
    ]);
});

it('deletes a shop and redirects', function () {
    $user = User::factory()->create();
    $shop = Shop::factory()->create();

    $this->actingAs($user);

    $response = $this->delete(route('admin.shops.destroy', $shop));

    $response->assertRedirect(route('admin.shops.index'));

    $this->assertDatabaseMissing('shops', [
        'id' => $shop->id,
    ]);
});
