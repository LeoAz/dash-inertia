<?php

use App\Models\Promotion;
use Illuminate\Support\Carbon;
use Tests\TestCase;

uses(TestCase::class);

it('returns false when promotion is inactive', function () {
    $promo = new Promotion;
    $promo->active = false;

    expect($promo->isActiveForDate(Carbon::parse('2025-01-15')))->toBeFalse();
});

it('respects starts_at and ends_at window (inclusive)', function () {
    $promo = new Promotion;
    $promo->active = true;
    $promo->starts_at = '2025-01-10';
    $promo->ends_at = '2025-01-20';

    // before
    expect($promo->isActiveForDate('2025-01-09'))->toBeFalse();

    // at start boundary
    expect($promo->isActiveForDate('2025-01-10'))->toBeTrue();

    // inside window
    expect($promo->isActiveForDate('2025-01-15'))->toBeTrue();

    // at end boundary
    expect($promo->isActiveForDate('2025-01-20'))->toBeTrue();

    // after
    expect($promo->isActiveForDate('2025-01-21'))->toBeFalse();
});

it('applies only on specified days when days_of_week is set', function () {
    // days_of_week uses 0 (Sunday) to 6 (Saturday). Let's pick Monday (1) and Friday (5)
    $promo = new Promotion;
    $promo->active = true;
    $promo->days_of_week = [1, 5];

    // 2025-01-13 is Monday
    expect($promo->isActiveForDate('2025-01-13'))->toBeTrue();

    // 2025-01-17 is Friday
    expect($promo->isActiveForDate('2025-01-17'))->toBeTrue();

    // 2025-01-15 is Wednesday (3)
    expect($promo->isActiveForDate('2025-01-15'))->toBeFalse();
});

it('treats empty or null days_of_week as no restriction', function () {
    $promoNull = new Promotion;
    $promoNull->active = true;
    $promoNull->days_of_week = null;

    $promoEmpty = new Promotion;
    $promoEmpty->active = true;
    $promoEmpty->days_of_week = [];

    expect($promoNull->isActiveForDate('2025-01-15'))->toBeTrue();
    expect($promoEmpty->isActiveForDate('2025-01-15'))->toBeTrue();
});

it('combines date window and days_of_week: must satisfy both', function () {
    $promo = new Promotion;
    $promo->active = true;
    $promo->starts_at = '2025-01-10';
    $promo->ends_at = '2025-01-20';
    $promo->days_of_week = [2, 4]; // Tue & Thu

    // In window but wrong day (2025-01-15 is Wed -> 3)
    expect($promo->isActiveForDate('2025-01-15'))->toBeFalse();

    // In window and right day (2025-01-16 is Thu -> 4)
    expect($promo->isActiveForDate('2025-01-16'))->toBeTrue();

    // Right day but out of window (2025-01-21 is Tue -> 2)
    expect($promo->isActiveForDate('2025-01-21'))->toBeFalse();
});
