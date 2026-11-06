<?php

use App\Models\Service;
use Database\Seeders\ServiceSeeder;
use Database\Seeders\ShopSeeder;

it('seeds services using ServiceSeeder', function () {
    // Ensure shops exist so services can be attached
    $this->seed(ShopSeeder::class);

    expect(Service::count())->toBe(0);

    $this->seed(ServiceSeeder::class);

    expect(Service::count())->toBeGreaterThan(0);
});
