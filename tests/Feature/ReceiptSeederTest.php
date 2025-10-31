<?php

use App\Models\Receipt;
use App\Models\Sale;
use Database\Seeders\DatabaseSeeder;
use Database\Seeders\HairdresserSeeder;
use Database\Seeders\ProductSeeder;
use Database\Seeders\PromotionSeeder;
use Database\Seeders\ReceiptSeeder;
use Database\Seeders\SaleSeeder;
use Database\Seeders\ServiceSeeder;
use Database\Seeders\ShopSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

it('creates receipts for existing sales when running ReceiptSeeder', function () {
    // Prepare shops, catalog, promotions, and sales
    $this->seed(ShopSeeder::class);
    $this->seed(HairdresserSeeder::class);
    $this->seed(ProductSeeder::class);
    $this->seed(ServiceSeeder::class);
    $this->seed(PromotionSeeder::class);
    $this->seed(SaleSeeder::class);

    expect(Receipt::count())->toBe(0);

    $this->seed(ReceiptSeeder::class);

    $salesWithShop = Sale::query()->whereNotNull('shop_id')->count();

    expect(Receipt::count())->toBeGreaterThan(0)
        ->and(Receipt::count())->toBe($salesWithShop);
});

it('seeds receipts with required relationships and fields via DatabaseSeeder', function () {
    $this->seed(DatabaseSeeder::class);

    $receipt = Receipt::query()->with(['sale', 'shop', 'generatedBy'])->first();

    expect($receipt)->not->toBeNull()
        ->and($receipt->sale)->not->toBeNull()
        ->and($receipt->shop)->not->toBeNull()
        ->and($receipt->generatedBy)->not->toBeNull()
        ->and($receipt->receipt_number)->toBeString()
        ->and($receipt->generated_at)->not->toBeNull();
});
