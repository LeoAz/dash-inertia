<?php

use App\Models\Product;
use Database\Seeders\ProductSeeder;
use Database\Seeders\ShopSeeder;

it('seeds products using ProductSeeder', function () {
    // Ensure shops exist so products can be attached
    $this->seed(ShopSeeder::class);

    expect(Product::count())->toBe(0);

    $this->seed(ProductSeeder::class);

    expect(Product::count())->toBeGreaterThan(0);
});
