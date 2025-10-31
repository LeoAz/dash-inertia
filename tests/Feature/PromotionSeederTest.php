<?php

use App\Models\Promotion;
use Database\Seeders\PromotionSeeder;
use Database\Seeders\ShopSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

it('seeds promotions for existing shops', function () {
    // Seed shops first
    $this->seed(ShopSeeder::class);

    expect(Promotion::count())->toBe(0);

    $this->seed(PromotionSeeder::class);

    expect(Promotion::count())->toBeGreaterThan(0);

    // All promotions should belong to a shop and have valid flags
    Promotion::all()->each(function (Promotion $promo) {
        expect($promo->shop_id)->not->toBeNull();
        expect($promo->active)->toBeBool();
        expect($promo->applicable_to_products)->toBeBool();
        expect($promo->applicable_to_services)->toBeBool();
    });
});
