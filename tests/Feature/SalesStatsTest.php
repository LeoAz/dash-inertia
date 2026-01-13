<?php

use App\Models\Sale;
use App\Models\Shop;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Spatie\Permission\Models\Role;

uses(RefreshDatabase::class);

it('includes payment method breakdown in daily stats', function () {
    $shop = Shop::factory()->create();
    $user = User::factory()->create();
    Role::create(['name' => 'admin']);
    $user->assignRole('admin'); // To allow date filtering and custom dates if needed, though we use today

    $this->actingAs($user);

    // Create sales with different payment methods
    Sale::factory()->for($shop)->create([
        'total_amount' => 1000,
        'payment_method' => 'caisse',
        'sale_date' => today(),
    ]);

    Sale::factory()->for($shop)->create([
        'total_amount' => 2000,
        'payment_method' => 'caisse',
        'sale_date' => today(),
    ]);

    Sale::factory()->for($shop)->create([
        'total_amount' => 5000,
        'payment_method' => 'orange_money',
        'sale_date' => today(),
    ]);

    // Sale for another day (should not be included)
    Sale::factory()->for($shop)->create([
        'total_amount' => 10000,
        'payment_method' => 'caisse',
        'sale_date' => today()->subDay(),
    ]);

    $response = $this->get(route('shops.sales.index', $shop));

    $response->assertStatus(200);
    $response->assertInertia(fn (Assert $page) => $page
        ->component('sales/index')
        ->has('daily_stats', fn (Assert $stats) => $stats
            ->where('total_vendu', 8000)
            ->where('total_caisse', 3000)
            ->where('total_orange_money', 5000)
            ->etc()
        )
    );
});
