
it('updates with amount only (percentage omitted) sets percentage to 0', function () {
    [$user, $shop] = actingAsUserWithShop();

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
    [$user, $shop] = actingAsUserWithShop();

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

<?php

use App\Models\Promotion;
use App\Models\Shop;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

function actingAsUserWithShop(): array
{
    /** @var User $user */
    $user = User::factory()->create();
    /** @var Shop $shop */
    $shop = Shop::factory()->create();
    $user->shops()->attach($shop->id);

    return [$user, $shop];
}

it('lists promotions', function () {
    [$user, $shop] = actingAsUserWithShop();

    Promotion::factory()->forAnyShop()->state(['shop_id' => $shop->id])->count(2)->create();

    $response = $this->actingAs($user)->get(route('shops.promotions.index', $shop));

    $response->assertSuccessful();
});

it('creates a promotion with percentage', function () {
    [$user, $shop] = actingAsUserWithShop();

    $payload = [
        'name' => 'Promo %',
        'percentage' => 10,
        'amount' => 0,
        'active' => true,
        'applicable_to_products' => true,
        'applicable_to_services' => false,
    ];

    $response = $this->actingAs($user)
        ->post(route('shops.promotions.store', $shop), $payload);

    $response->assertRedirect(route('shops.promotions.index', $shop));

    $this->assertDatabaseHas('promotions', [
        'shop_id' => $shop->id,
        'name' => 'Promo %',
        'percentage' => 10.00,
        'amount' => 0.00,
        'active' => 1,
        'applicable_to_products' => 1,
        'applicable_to_services' => 0,
    ]);
});

it('fails validation when both percentage and amount are set', function () {
    [$user, $shop] = actingAsUserWithShop();

    $payload = [
        'name' => 'Promo invalide',
        'percentage' => 10,
        'amount' => 1000,
        'active' => true,
        'applicable_to_products' => true,
        'applicable_to_services' => false,
    ];

    $response = $this->actingAs($user)
        ->from(route('shops.promotions.index', $shop))
        ->post(route('shops.promotions.store', $shop), $payload);

    $response->assertSessionHasErrors(['percentage', 'amount']);
});

it('fails validation when neither percentage nor amount are set', function () {
    [$user, $shop] = actingAsUserWithShop();

    $payload = [
        'name' => 'Promo invalide',
        'percentage' => 0,
        'amount' => 0,
        'active' => true,
        'applicable_to_products' => true,
        'applicable_to_services' => false,
    ];

    $response = $this->actingAs($user)
        ->from(route('shops.promotions.index', $shop))
        ->post(route('shops.promotions.store', $shop), $payload);

    $response->assertSessionHasErrors(['percentage', 'amount']);
});

it('updates a promotion', function () {
    [$user, $shop] = actingAsUserWithShop();

    /** @var Promotion $promotion */
    $promotion = Promotion::factory()->forAnyShop()->state([
        'shop_id' => $shop->id,
        'name' => 'Initial',
        'percentage' => 5,
        'amount' => 0,
        'active' => true,
        'applicable_to_products' => true,
        'applicable_to_services' => false,
    ])->create();

    $payload = [
        'name' => 'Updated',
        'percentage' => 0,
        'amount' => 1500,
        'active' => false,
        'applicable_to_products' => false,
        'applicable_to_services' => true,
    ];

    $response = $this->actingAs($user)
        ->put(route('shops.promotions.update', [$shop, $promotion]), $payload);

    $response->assertRedirect(route('shops.promotions.index', $shop));

    $this->assertDatabaseHas('promotions', [
        'id' => $promotion->id,
        'name' => 'Updated',
        'percentage' => 0.00,
        'amount' => 1500.00,
        'active' => 0,
        'applicable_to_products' => 0,
        'applicable_to_services' => 1,
    ]);
});

it('deletes a promotion', function () {
    [$user, $shop] = actingAsUserWithShop();

    /** @var Promotion $promotion */
    $promotion = Promotion::factory()->forAnyShop()->state(['shop_id' => $shop->id])->create();

    $response = $this->actingAs($user)
        ->delete(route('shops.promotions.destroy', [$shop, $promotion]));

    $response->assertRedirect(route('shops.promotions.index', $shop));

    $this->assertDatabaseMissing('promotions', [
        'id' => $promotion->id,
    ]);
});
