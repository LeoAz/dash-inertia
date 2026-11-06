<?php

use App\Models\Receipt;
use App\Models\Sale;
use App\Models\Shop;
use App\Models\User;
use Spatie\Permission\Models\Role;

it('serves the receipt QR code as an SVG image', function () {
    $sale = Sale::factory()->for(Shop::factory())->create();

    $response = $this->actingAs(User::factory()->create()->assignRole(Role::findOrCreate('Super admin')))
        ->get(route('shops.sales.qr', [$sale->shop_id, $sale]));

    $response->assertOk()->assertHeader('Content-Type', 'image/svg+xml');
    expect($response->getContent())->toContain('<svg');
});

it('redirects guests to the login page', function () {
    $sale = Sale::factory()->for(Shop::factory())->create();

    $this->get(route('shops.sales.qr', [$sale->shop_id, $sale]))
        ->assertRedirect(route('login'));
});

it('returns 404 for a sale that belongs to another shop', function () {
    $sale = Sale::factory()->for(Shop::factory())->create();
    $otherShop = Shop::factory()->create();

    $this->actingAs(User::factory()->create()->assignRole(Role::findOrCreate('Super admin')))
        ->get(route('shops.sales.qr', [$otherShop, $sale]))
        ->assertNotFound();
});

it('encodes the receipt summary without any customer data', function () {
    $shop = Shop::factory()->create(['name' => 'Mansa Centre']);
    $sale = Sale::factory()->for($shop)->create([
        'customer_name' => 'Awa Traoré',
        'customer_phone' => '70000000',
        'sale_date' => '2026-11-06 11:22:00',
        'total_amount' => 13500,
    ]);
    Receipt::factory()->create(['sale_id' => $sale->id, 'shop_id' => $shop->id, 'receipt_number' => 'RC-TEST-1']);

    $content = $sale->refresh()->receiptQrContent();

    expect($content)->toBe("Mansa Centre\nReçu RC-TEST-1\n06/11/2026 11:22\nTotal 13 500 F CFA")
        ->not->toContain('Awa')
        ->not->toContain('70000000');
});
