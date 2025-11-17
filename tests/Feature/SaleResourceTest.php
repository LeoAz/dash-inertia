<?php

use App\Http\Resources\SaleResource;
use App\Models\Hairdresser;
use App\Models\Product;
use App\Models\Promotion;
use App\Models\Receipt;
use App\Models\Sale;
use App\Models\Service;
use App\Models\Shop;
use App\Models\User;

it('serializes a sale with relations consistently', function () {
    $shop = Shop::factory()->create();
    $user = User::factory()->create();
    $hairdresser = Hairdresser::factory()->state(['shop_id' => $shop->id])->create();

    // Create products/services for the shop
    $products = Product::factory()->count(2)->state(['shop_id' => $shop->id])->create();
    $services = Service::factory()->count(1)->state(['shop_id' => $shop->id])->create();

    // Create a promotion applicable to both
    $promotion = Promotion::factory()->state([
        'shop_id' => $shop->id,
        'percentage' => 10,
        'amount' => 0,
        'applicable_to_products' => true,
        'applicable_to_services' => true,
        'active' => true,
        'starts_at' => now()->subDay(),
        'ends_at' => now()->addDay(),
    ])->create();

    $sale = Sale::factory()->state([
        'shop_id' => $shop->id,
        'user_id' => $user->id,
        'hairdresser_id' => $hairdresser->id,
        'promotion_id' => $promotion->id,
        'sale_date' => now(),
    ])->create();

    // Attach lines
    $sale->products()->attach([
        $products[0]->id => ['quantity' => 2, 'unit_price' => $products[0]->price, 'subtotal' => $products[0]->price * 2],
        $products[1]->id => ['quantity' => 1, 'unit_price' => $products[1]->price, 'subtotal' => $products[1]->price * 1],
    ]);
    $sale->services()->attach([
        $services[0]->id => ['unit_price' => $services[0]->price, 'subtotal' => $services[0]->price],
    ]);

    // Create a receipt
    Receipt::factory()->state([
        'sale_id' => $sale->id,
        'shop_id' => $shop->id,
        'generated_by' => $user->id,
    ])->create();

    // Load relations
    $sale->load(['receipt', 'hairdresser', 'promotion', 'products', 'services']);

    $payload = (new SaleResource($sale))->toArray(request());

    expect($payload)
        ->toHaveKeys([
            'id', 'shop_id', 'receipt_number', 'customer_name', 'hairdresser_name', 'total_amount', 'sale_date', 'promotion_applied', 'promotion_label', 'details',
        ]);

    expect($payload['receipt_number'])->not->toBeNull();
    expect($payload['hairdresser_name'])->toBe($hairdresser->name);
    expect($payload['promotion_applied'])->toBeTrue();

    // Details should include both product and service lines
    $types = collect($payload['details'])->pluck('type')->all();
    expect($types)->toContain('product');
    expect($types)->toContain('service');
});
