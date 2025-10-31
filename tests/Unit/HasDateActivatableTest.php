<?php

use App\Models\Promotion;
use Illuminate\Support\Carbon;
use Tests\TestCase;

uses(TestCase::class);

it('promotion: returns false when inactive', function () {
    $date = Carbon::parse('2025-01-15');

    $promo = new Promotion;
    $promo->active = false;

    expect($promo->isActiveForDate($date))->toBeFalse();
});

it('promotion: returns false before starts_at and after ends_at', function () {
    $promo = new Promotion;
    $promo->active = true;
    $promo->starts_at = '2025-01-15';
    $promo->ends_at = '2025-01-31';

    expect($promo->isActiveForDate('2025-01-10'))->toBeFalse();
    expect($promo->isActiveForDate('2025-02-01'))->toBeFalse();
});

it('promotion: returns true within the window and with open-ended ranges', function () {
    $date = Carbon::parse('2025-01-20');

    $promoWindow = new Promotion;
    $promoWindow->active = true;
    $promoWindow->starts_at = '2025-01-15';
    $promoWindow->ends_at = '2025-01-31';

    $promoNoBounds = new Promotion;
    $promoNoBounds->active = true;

    $promoOnlyStart = new Promotion;
    $promoOnlyStart->active = true;
    $promoOnlyStart->starts_at = '2025-01-01';

    $promoOnlyEnd = new Promotion;
    $promoOnlyEnd->active = true;
    $promoOnlyEnd->ends_at = '2025-12-31';

    expect($promoWindow->isActiveForDate($date))->toBeTrue();
    expect($promoNoBounds->isActiveForDate($date))->toBeTrue();
    expect($promoOnlyStart->isActiveForDate($date))->toBeTrue();
    expect($promoOnlyEnd->isActiveForDate($date))->toBeTrue();
});

it('promotion: applies only on specified days when days_of_week is set', function () {
    $promo = new Promotion;
    $promo->active = true;
    $promo->days_of_week = [1, 5]; // Monday & Friday

    // Monday 2025-01-13
    expect($promo->isActiveForDate('2025-01-13'))->toBeTrue();

    // Friday 2025-01-17
    expect($promo->isActiveForDate('2025-01-17'))->toBeTrue();

    // Wednesday 2025-01-15
    expect($promo->isActiveForDate('2025-01-15'))->toBeFalse();
});

it('promotion: treats empty or null days_of_week as no restriction', function () {
    $promoNull = new Promotion;
    $promoNull->active = true;
    $promoNull->days_of_week = null;

    $promoEmpty = new Promotion;
    $promoEmpty->active = true;
    $promoEmpty->days_of_week = [];

    expect($promoNull->isActiveForDate('2025-01-15'))->toBeTrue();
    expect($promoEmpty->isActiveForDate('2025-01-15'))->toBeTrue();
});

it('promotion: combines date window and days_of_week: must satisfy both', function () {
    $promo = new Promotion;
    $promo->active = true;
    $promo->starts_at = '2025-01-10';
    $promo->ends_at = '2025-01-20';
    $promo->days_of_week = [2, 4]; // Tue & Thu

    // In window but wrong day (Wed 2025-01-15)
    expect($promo->isActiveForDate('2025-01-15'))->toBeFalse();

    // In window and right day (Thu 2025-01-16)
    expect($promo->isActiveForDate('2025-01-16'))->toBeTrue();

    // Right day but out of window (Tue 2025-01-21)
    expect($promo->isActiveForDate('2025-01-21'))->toBeFalse();
});

it('promotion: applicability flags default to both true and can be toggled', function () {
    $promoDefault = new Promotion;
    expect($promoDefault->appliesToProducts())->toBeTrue();
    expect($promoDefault->appliesToServices())->toBeTrue();

    $promoProductsOnly = new Promotion;
    $promoProductsOnly->applicable_to_products = true;
    $promoProductsOnly->applicable_to_services = false;
    expect($promoProductsOnly->appliesToProducts())->toBeTrue();
    expect($promoProductsOnly->appliesToServices())->toBeFalse();

    $promoServicesOnly = new Promotion;
    $promoServicesOnly->applicable_to_products = false;
    $promoServicesOnly->applicable_to_services = true;
    expect($promoServicesOnly->appliesToProducts())->toBeFalse();
    expect($promoServicesOnly->appliesToServices())->toBeTrue();
});
