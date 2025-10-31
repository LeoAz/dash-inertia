<?php

use App\Models\Sale;
use App\Models\Shop;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

it('shows sales history page and filters by date range', function () {
    $user = User::factory()->create(['email_verified_at' => now()]);
    $shop = Shop::factory()->create();

    // Two sales on different dates
    $older = Sale::factory()->for($shop)->create([
        'sale_date' => now()->subDays(10),
    ]);
    $newer = Sale::factory()->for($shop)->create([
        'sale_date' => now()->subDays(2),
    ]);

    $this->actingAs($user);

    // No filters: both should be visible in the inertia props paginator
    $resp = $this->get(route('shops.sales.history', $shop));
    $resp->assertSuccessful();
    $resp->assertInertia(fn ($page) => $page
        ->component('sales/all-sales')
        ->has('sales.data', 2)
    );

    // Filter to only include the older sale
    $resp = $this->get(route('shops.sales.history', [$shop, 'date_from' => now()->subDays(11)->toDateString(), 'date_to' => now()->subDays(9)->toDateString()]));
    $resp->assertSuccessful();
    $resp->assertInertia(fn ($page) => $page
        ->component('sales/all-sales')
        ->where('sales.data.0.id', $older->id)
        ->has('sales.data', 1)
    );
});
