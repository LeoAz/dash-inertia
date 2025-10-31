<?php

use App\Models\Hairdresser;
use App\Models\Shop;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

function actingInShop(): array
{
    $user = User::factory()->create();
    $shop = Shop::factory()->create();
    $user->shops()->attach($shop->id);

    return [$user, $shop];
}

it('lists hairdressers for a shop', function () {
    [$user, $shop] = actingInShop();

    Hairdresser::factory()->forAnyShop()->count(3)->create(['shop_id' => $shop->id]);

    $this->actingAs($user)
        ->get(route('shops.hairdressers.index', $shop))
        ->assertSuccessful();
});

it('creates a hairdresser', function () {
    [$user, $shop] = actingInShop();

    $payload = [
        'name' => 'John Doe',
        'phone' => '+33123456789',
        'hire_date' => '2025-01-10',
    ];

    $this->actingAs($user)
        ->post(route('shops.hairdressers.store', $shop), $payload)
        ->assertRedirect(route('shops.hairdressers.index', $shop));

    $this->assertDatabaseHas('hairdressers', [
        'shop_id' => $shop->id,
        'name' => 'John Doe',
        'phone' => '+33123456789',
        'hire_date' => '2025-01-10',
    ]);
});

it('validates required fields on create', function () {
    [$user, $shop] = actingInShop();

    $this->actingAs($user)
        ->post(route('shops.hairdressers.store', $shop), [])
        ->assertSessionHasErrors(['name']);
});

it('updates a hairdresser', function () {
    [$user, $shop] = actingInShop();

    $hairdresser = Hairdresser::factory()->forAnyShop()->create(['shop_id' => $shop->id]);

    $payload = [
        'name' => 'Jane Doe',
        'phone' => '+33987654321',
        'hire_date' => '2025-02-15',
    ];

    $this->actingAs($user)
        ->put(route('shops.hairdressers.update', [$shop, $hairdresser]), $payload)
        ->assertRedirect(route('shops.hairdressers.index', $shop));

    $this->assertDatabaseHas('hairdressers', [
        'id' => $hairdresser->id,
        'shop_id' => $shop->id,
        'name' => 'Jane Doe',
        'phone' => '+33987654321',
        'hire_date' => '2025-02-15',
    ]);
});

it('deletes a hairdresser', function () {
    [$user, $shop] = actingInShop();

    $hairdresser = Hairdresser::factory()->forAnyShop()->create(['shop_id' => $shop->id]);

    $this->actingAs($user)
        ->delete(route('shops.hairdressers.destroy', [$shop, $hairdresser]))
        ->assertRedirect(route('shops.hairdressers.index', $shop));

    $this->assertDatabaseMissing('hairdressers', [
        'id' => $hairdresser->id,
    ]);
});
