<?php

use App\Models\Hairdresser;
use Database\Seeders\HairdresserSeeder;
use Database\Seeders\ShopSeeder;

it('seeds hairdressers when shops exist', function () {
    // Seed shops first
    $this->seed(ShopSeeder::class);

    expect(Hairdresser::count())->toBe(0);

    $this->seed(HairdresserSeeder::class);

    expect(Hairdresser::count())->toBeGreaterThan(0);
});

it('seeds hairdressers even when no shops exist (shop_id nullable)', function () {
    expect(Hairdresser::count())->toBe(0);

    $this->seed(HairdresserSeeder::class);

    expect(Hairdresser::count())->toBeGreaterThan(0);
});
