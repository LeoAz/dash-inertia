<?php

use App\Models\Sale;
use App\Models\Shop;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

it('returns unique client suggestions (name + phone) for a shop', function () {
    $shop = Shop::factory()->create();
    $otherShop = Shop::factory()->create();
    $user = User::factory()->create();
    $this->actingAs($user);

    // Duplicate pairs in same shop
    Sale::factory()->for($shop)->create([
        'customer_name' => 'Alice',
        'customer_phone' => '01020304',
    ]);
    Sale::factory()->for($shop)->create([
        'customer_name' => 'Alice',
        'customer_phone' => '01020304',
    ]);

    // Different pair in same shop
    Sale::factory()->for($shop)->create([
        'customer_name' => 'Bob',
        'customer_phone' => '0555',
    ]);

    // Same name different phone in other shop (should not be returned)
    Sale::factory()->for($otherShop)->create([
        'customer_name' => 'Alice',
        'customer_phone' => '0999',
    ]);

    $resp = $this->getJson(route('shops.sales.client-suggestions', $shop));
    $resp->assertOk();

    $data = $resp->json();
    expect($data)->toBeArray();

    // Should contain unique pairs for the current shop only
    // Order is by most recent sale ids; we only check that pairs exist uniquely
    $pairs = array_map(fn ($i) => ($i['name'] ?? '').'|'.($i['phone'] ?? ''), $data);
    expect($pairs)->toContain('Alice|01020304');
    expect($pairs)->toContain('Bob|0555');
    // Ensure other shop pair is not present
    expect($pairs)->not->toContain('Alice|0999');

    // Ensure uniqueness
    expect(count($pairs))->toEqual(count(array_unique($pairs)));
});

it('filters suggestions by q on name or phone and respects limit', function () {
    $shop = Shop::factory()->create();
    $user = User::factory()->create();
    $this->actingAs($user);

    // Create a few clients
    Sale::factory()->for($shop)->create(['customer_name' => 'Alice Martin', 'customer_phone' => '01020304']);
    Sale::factory()->for($shop)->create(['customer_name' => 'Alix Dupont', 'customer_phone' => '01009999']);
    Sale::factory()->for($shop)->create(['customer_name' => 'Bob', 'customer_phone' => '0555']);

    // Filter by name prefix "Ali"
    $resp = $this->getJson(route('shops.sales.client-suggestions', [$shop, 'q' => 'Ali', 'limit' => 1]));
    $resp->assertOk();
    $data = $resp->json();
    expect($data)->toBeArray();
    expect(count($data))->toBeLessThanOrEqual(1);

    // Filter by phone fragment
    $resp2 = $this->getJson(route('shops.sales.client-suggestions', [$shop, 'q' => '0555']));
    $resp2->assertOk();
    $data2 = $resp2->json();
    $pairs2 = array_map(fn ($i) => ($i['name'] ?? '').'|'.($i['phone'] ?? ''), $data2);
    expect($pairs2)->toContain('Bob|0555');
});
