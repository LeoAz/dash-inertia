<?php

use App\Models\Sale;
use Database\Seeders\ProductSeeder;
use Database\Seeders\PromotionSeeder;
use Database\Seeders\SaleSeeder;
use Database\Seeders\ServiceSeeder;
use Database\Seeders\ShopSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

it('seeds sales with line items and optional promotions', function () {
    // Ensure base data
    $this->seed(ShopSeeder::class);
    $this->seed(ProductSeeder::class);
    $this->seed(ServiceSeeder::class);
    $this->seed(PromotionSeeder::class);

    expect(Sale::count())->toBe(0);

    $this->seed(SaleSeeder::class);

    expect(Sale::count())->toBeGreaterThan(0);

    // Ensure at least one sale has products or services and totals set
    $sale = Sale::query()->with(['products', 'services'])->first();
    expect($sale)->not->toBeNull();
    expect($sale->total_amount)->toBeGreaterThanOrEqual(0);
    expect($sale->products->count() + $sale->services->count())->toBeGreaterThan(0);
});
