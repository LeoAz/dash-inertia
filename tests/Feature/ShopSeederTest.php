<?php

use App\Models\Shop;
use Database\Seeders\ShopSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

it('seeds shops using ShopSeeder', function () {
    expect(Shop::count())->toBe(0);

    $this->seed(ShopSeeder::class);

    expect(Shop::count())->toBeGreaterThan(0);
});
