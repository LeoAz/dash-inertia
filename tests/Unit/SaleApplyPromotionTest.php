<?php

use App\Models\Product;
use App\Models\Promotion;
use App\Models\Sale;
use App\Models\Service;
use App\Models\Shop;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Tests\TestCase;

uses(TestCase::class, Illuminate\Foundation\Testing\RefreshDatabase::class);

function makeShop(): Shop
{
    return Shop::query()->create([
        'name' => 'Test Shop',
        'address' => '123 Test St',
        'phone' => '555-0000',
        'email' => 'shop@example.com',
    ]);
}

function makeSale(Shop $shop, string $date, float $total): Sale
{
    return Sale::query()->create([
        'uuid' => (string) Str::uuid(),
        'shop_id' => $shop->id,
        'customer_name' => 'John Doe',
        'customer_phone' => '555-000',
        'sale_date' => $date,
        'total_amount' => $total,
    ]);
}

function makeProduct(Shop $shop, string $name = 'P1', float $price = 10.0): Product
{
    return Product::query()->create([
        'shop_id' => $shop->id,
        'name' => $name,
        'quantity' => 100,
        'price' => $price,
    ]);
}

function makeService(Shop $shop, string $name = 'S1', float $price = 20.0): Service
{
    return Service::query()->create([
        'shop_id' => $shop->id,
        'name' => $name,
        'price' => $price,
    ]);
}

function makePromotion(Shop $shop, array $attrs = []): Promotion
{
    $defaults = [
        'name' => 'Promo',
        'percentage' => 0,
        'amount' => 0,
        'active' => true,
        'days_of_week' => null,
        'starts_at' => null,
        'ends_at' => null,
        'applicable_to_products' => true,
        'applicable_to_services' => true,
    ];

    return Promotion::query()->create(array_merge($defaults, ['shop_id' => $shop->id], $attrs));
}

beforeEach(function () {
    // Ensure Str helper is available in this file
    if (! class_exists(Str::class)) {
        class_alias(\Illuminate\Support\Str::class, 'Str');
    }
});

it('applies percentage on products-only over products subtotal', function () {
    $shop = makeShop();
    $sale = makeSale($shop, '2025-01-13', 100.00); // Monday

    $p1 = makeProduct($shop, 'Shampoo', 10.00);
    $p2 = makeProduct($shop, 'Gel', 5.00);
    $s1 = makeService($shop, 'Cut', 20.00);

    // Attach line items: product subtotals = 10*2 + 5*4 = 20 + 20 = 40
    $sale->products()->attach($p1->id, ['quantity' => 2, 'unit_price' => 10.00, 'subtotal' => 20.00]);
    $sale->products()->attach($p2->id, ['quantity' => 4, 'unit_price' => 5.00, 'subtotal' => 20.00]);

    // Service subtotal 20
    $sale->services()->attach($s1->id, ['unit_price' => 20.00, 'subtotal' => 20.00]);

    $promo = makePromotion($shop, [
        'name' => '10% Products Only',
        'percentage' => 10,
        'amount' => 0,
        'applicable_to_products' => true,
        'applicable_to_services' => false,
        'days_of_week' => null,
    ]);

    // Explicitly selected
    $sale->applyPromotion($promo);

    expect($sale->promotion_id)->toBe($promo->id);
    // 10% of products subtotal (40) = 4.00
    expect((float) $sale->discount_amount)->toBe(4.00);
});

it('applies fixed amount on services-only and caps to eligible subtotal', function () {
    $shop = makeShop();
    $sale = makeSale($shop, '2025-01-13', 200.00);

    $s1 = makeService($shop, 'Color', 50.00);
    $sale->services()->attach($s1->id, ['unit_price' => 50.00, 'subtotal' => 50.00]);

    // Promotion amount 80, applies only to services. Eligible base = 50, so discount is capped to 50.
    $promo = makePromotion($shop, [
        'name' => 'Amount on Services',
        'percentage' => 0,
        'amount' => 80,
        'applicable_to_products' => false,
        'applicable_to_services' => true,
        'days_of_week' => null,
    ]);

    $sale->applyPromotion($promo);

    expect($sale->promotion_id)->toBe($promo->id);
    expect((float) $sale->discount_amount)->toBe(50.00);
});

it('throws when no eligible items per applicability flags', function () {
    $shop = makeShop();
    $sale = makeSale($shop, '2025-01-13', 120.00);

    // Only services in sale, but promo applies to products only
    $s1 = makeService($shop, 'Wash', 15.00);
    $sale->services()->attach($s1->id, ['unit_price' => 15.00, 'subtotal' => 15.00]);

    $promo = makePromotion($shop, [
        'name' => 'Products only',
        'percentage' => 10,
        'amount' => 0,
        'applicable_to_products' => true,
        'applicable_to_services' => false,
        'days_of_week' => null,
    ]);

    expect(fn () => $sale->applyPromotion($promo))
        ->toThrow(ValidationException::class);
});

it('explicitly selected promotion with days_of_week mismatch is not applied', function () {
    $shop = makeShop();
    // Wednesday 2025-01-15 (3)
    $sale = makeSale($shop, '2025-01-15', 100.00);

    $p1 = makeProduct($shop, 'Wax', 25.00);
    $sale->products()->attach($p1->id, ['quantity' => 2, 'unit_price' => 25.00, 'subtotal' => 50.00]);

    // Promo only valid on Monday (1)
    $promo = makePromotion($shop, [
        'name' => 'Monday only',
        'percentage' => 20,
        'amount' => 0,
        'days_of_week' => [1],
        'applicable_to_products' => true,
        'applicable_to_services' => false,
    ]);

    $sale->applyPromotion($promo);

    expect($sale->promotion_id)->toBeNull();
    expect($sale->discount_amount)->toBeNull();
});

it('auto-selects active shop promotion when none provided and applies over eligible base', function () {
    $shop = makeShop();
    $sale = makeSale($shop, '2025-01-16', 300.00); // Thursday

    $p1 = makeProduct($shop, 'Comb', 10.00);
    $s1 = makeService($shop, 'Style', 40.00);

    $sale->products()->attach($p1->id, ['quantity' => 10, 'unit_price' => 10.00, 'subtotal' => 100.00]);
    $sale->services()->attach($s1->id, ['unit_price' => 40.00, 'subtotal' => 80.00]);

    // Two promotions: one 5% (products+services), one 15% (products only). Shop.activePromotionForDate picks highest percentage.
    makePromotion($shop, [
        'name' => '5% all',
        'percentage' => 5,
        'applicable_to_products' => true,
        'applicable_to_services' => true,
        'days_of_week' => [4], // Thu
    ]);

    $p15 = makePromotion($shop, [
        'name' => '15% products',
        'percentage' => 15,
        'applicable_to_products' => true,
        'applicable_to_services' => false,
        'days_of_week' => [4], // Thu
    ]);

    // No explicit promotion passed
    $sale->applyPromotion();

    // Expect the 15% one chosen per Shop::activePromotionForDate
    expect($sale->promotion_id)->toBe($p15->id);
    // 15% over products subtotal only = 15% of 100 = 15
    expect((float) $sale->discount_amount)->toBe(15.00);
});
