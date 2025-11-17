<?php

use App\Models\Product;
use App\Models\Sale;
use App\Models\Service;
use App\Models\Shop;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;

uses(RefreshDatabase::class);

it('creates a receipt with a receipt_number when storing a sale', function () {
    $shop = Shop::factory()->create();
    $user = User::factory()->create();
    $this->actingAs($user);

    $product = Product::factory()->for($shop)->create(['price' => 1000]);
    $service = Service::factory()->for($shop)->create(['price' => 1500]);

    $payload = [
        'customer_name' => 'Test Client',
        'customer_phone' => '01010101',
        'sale_date' => Carbon::today()->toDateString(),
        'products' => [
            ['product_id' => $product->id, 'quantity' => 1],
        ],
        'services' => [
            ['service_id' => $service->id],
        ],
    ];

    $response = $this->post(route('shops.sales.store', $shop), $payload);
    $response->assertRedirect(route('shops.sales.index', $shop));

    $sale = Sale::query()->where('shop_id', $shop->id)->latest('id')->with('receipt')->first();

    expect($sale)->not()->toBeNull();
    expect($sale->receipt)->not()->toBeNull();
    expect($sale->receipt->receipt_number)->not()->toBeEmpty();
});
