<?php

use App\Models\Product;
use App\Models\Promotion;
use App\Models\Sale;
use App\Models\Service;
use App\Models\Shop;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;

uses(RefreshDatabase::class);

it('stores a sale with products and services and computes totals', function () {
    $shop = Shop::factory()->create();
    $user = User::factory()->create();
    $this->actingAs($user);

    $p1 = Product::factory()->for($shop)->create(['price' => 1500]);
    $p2 = Product::factory()->for($shop)->create(['price' => 1000]);
    $s1 = Service::factory()->for($shop)->create(['price' => 2000]);

    $payload = [
        'customer_name' => 'Alice',
        'customer_phone' => '01020304',
        'sale_date' => Carbon::today()->toDateString(),
        'products' => [
            ['product_id' => $p1->id, 'quantity' => 2],
            ['product_id' => $p2->id, 'quantity' => 1],
        ],
        'services' => [
            ['service_id' => $s1->id],
        ],
    ];

    $resp = $this->post(route('shops.sales.store', $shop), $payload);

    $resp->assertRedirect(route('shops.sales.index', $shop));

    $sale = Sale::query()->where('shop_id', $shop->id)->first();
    expect($sale)->not()->toBeNull();

    // Products: 1500*2 + 1000*1 = 4000
    // Services: 2000
    // Total = 6000
    expect((float) $sale->total_amount)->toEqual(6000.0);
    expect($sale->discount_amount)->toBeNull();

    // Pivot assertions
    $this->assertDatabaseHas('product_sales', [
        'sale_id' => $sale->id,
        'product_id' => $p1->id,
        'quantity' => 2,
        'unit_price' => 1500,
        'subtotal' => 3000,
    ]);
    $this->assertDatabaseHas('product_sales', [
        'sale_id' => $sale->id,
        'product_id' => $p2->id,
        'quantity' => 1,
        'unit_price' => 1000,
        'subtotal' => 1000,
    ]);
    $this->assertDatabaseHas('service_sales', [
        'sale_id' => $sale->id,
        'service_id' => $s1->id,
        'unit_price' => 2000,
        'subtotal' => 2000,
    ]);
});

it('applies percentage promotion to eligible items', function () {
    $shop = Shop::factory()->create();
    $user = User::factory()->create();
    $this->actingAs($user);

    $p1 = Product::factory()->for($shop)->create(['price' => 1000]);
    $s1 = Service::factory()->for($shop)->create(['price' => 3000]);

    // 10% only on products
    $promo = Promotion::factory()->for($shop)->create([
        'percentage' => 10,
        'amount' => null,
        'active' => true,
        'applicable_to_products' => true,
        'applicable_to_services' => false,
        'starts_at' => now()->subDay(),
        'ends_at' => now()->addDay(),
    ]);

    $payload = [
        'customer_name' => 'Bob',
        'customer_phone' => '0555',
        'sale_date' => now()->toDateString(),
        'products' => [
            ['product_id' => $p1->id, 'quantity' => 3], // 3000 base eligible
        ],
        'services' => [
            ['service_id' => $s1->id], // 3000 not eligible
        ],
        'promotion_id' => $promo->id,
    ];

    $resp = $this->post(route('shops.sales.store', $shop), $payload);
    $resp->assertRedirect(route('shops.sales.index', $shop));

    $sale = Sale::query()->where('shop_id', $shop->id)->latest('id')->first();
    expect($sale)->not()->toBeNull();

    // Gross: 3000 + 3000 = 6000
    // Discount: 10% of products (3000) = 300
    // Total: 5700
    expect((float) $sale->discount_amount)->toEqual(300.0);
    expect((float) $sale->total_amount)->toEqual(5700.0);
    expect($sale->promotion_id)->toEqual($promo->id);
});

it('applies fixed amount promotion capped to eligible base', function () {
    $shop = Shop::factory()->create();
    $user = User::factory()->create();
    $this->actingAs($user);

    $p1 = Product::factory()->for($shop)->create(['price' => 1200]);

    // Fixed 5000 on products & services
    $promo = Promotion::factory()->for($shop)->create([
        'percentage' => null,
        'amount' => 5000,
        'active' => true,
        'applicable_to_products' => true,
        'applicable_to_services' => true,
        'starts_at' => now()->subDay(),
        'ends_at' => now()->addDay(),
    ]);

    $payload = [
        'customer_name' => 'Chad',
        'customer_phone' => '0777',
        'sale_date' => now()->toDateString(),
        'products' => [
            ['product_id' => $p1->id, 'quantity' => 2], // 2400 eligible base
        ],
        'services' => [],
        'promotion_id' => $promo->id,
    ];

    $resp = $this->post(route('shops.sales.store', $shop), $payload);
    $resp->assertRedirect(route('shops.sales.index', $shop));

    $sale = Sale::query()->where('shop_id', $shop->id)->latest('id')->first();
    expect($sale)->not()->toBeNull();

    // Gross: 2400, Discount capped to 2400, Total: 0
    expect((float) $sale->discount_amount)->toEqual(2400.0);
    expect((float) $sale->total_amount)->toEqual(0.0);
});
