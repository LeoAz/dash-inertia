<?php

use App\Models\Promotion;
use App\Models\Shop;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

function actAsWithShop(): array
{
    /** @var User $user */
    $user = User::factory()->create();
    /** @var Shop $shop */
    $shop = Shop::factory()->create();
    $user->shops()->attach($shop->id);

    return [$user, $shop];
}

it('updates with amount only (percentage omitted) sets percentage to 0', function () {
    [$user, $shop] = actAsWithShop();

    /** @var Promotion $promotion */
    $promotion = Promotion::factory()->forAnyShop()->state([
        'shop_id' => $shop->id,
        'name' => 'Initial',
        'percentage' => 5,
        'amount' => 0,
    ])->create();

    // Do not send the percentage key at all, only amount
    $payload = [
        'name' => 'Only Amount',
        'amount' => 1200,
        'active' => true,
        'applicable_to_products' => true,
        'applicable_to_services' => false,
    ];

    $response = $this->actingAs($user)
        ->put(route('shops.promotions.update', [$shop, $promotion]), $payload);

    $response->assertRedirect(route('shops.promotions.index', $shop));

    $this->assertDatabaseHas('promotions', [
        'id' => $promotion->id,
        'percentage' => 0.00,
        'amount' => 1200.00,
    ]);
});

it('updates with percentage only (amount omitted) sets amount to 0', function () {
    [$user, $shop] = actAsWithShop();

    /** @var Promotion $promotion */
    $promotion = Promotion::factory()->forAnyShop()->state([
        'shop_id' => $shop->id,
        'name' => 'Initial',
        'percentage' => 0,
        'amount' => 2000,
    ])->create();

    // Do not send the amount key at all, only percentage
    $payload = [
        'name' => 'Only Percentage',
        'percentage' => 12.5,
        'active' => true,
        'applicable_to_products' => true,
        'applicable_to_services' => false,
    ];

    $response = $this->actingAs($user)
        ->put(route('shops.promotions.update', [$shop, $promotion]), $payload);

    $response->assertRedirect(route('shops.promotions.index', $shop));

    $this->assertDatabaseHas('promotions', [
        'id' => $promotion->id,
        'percentage' => 12.50,
        'amount' => 0.00,
    ]);
});
