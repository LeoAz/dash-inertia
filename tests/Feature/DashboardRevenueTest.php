<?php

use App\Models\Hairdresser;
use App\Models\Sale;
use App\Models\Shop;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('dashboard shows correct revenue including identical looking sales', function () {
    $shop = Shop::factory()->create();
    $user = User::factory()->create();
    $hairdresser = Hairdresser::factory()->create(['shop_id' => $shop->id]);

    $saleDate = now()->format('Y-m-d H:i:s');
    $customerName = 'Ousmane';
    $amount = 7500;

    // Création de deux ventes identiques (même date, client, montant, coiffeur)
    Sale::factory()->create([
        'shop_id' => $shop->id,
        'user_id' => $user->id,
        'customer_name' => $customerName,
        'total_amount' => $amount,
        'sale_date' => $saleDate,
        'hairdresser_id' => $hairdresser->id,
    ]);

    Sale::factory()->create([
        'shop_id' => $shop->id,
        'user_id' => $user->id,
        'customer_name' => $customerName,
        'total_amount' => $amount,
        'sale_date' => $saleDate,
        'hairdresser_id' => $hairdresser->id,
    ]);

    $response = $this->actingAs($user)->get("/shops/{$shop->id}/dashboard");

    $response->assertStatus(200);

    // Le chiffre d'affaires total devrait être 15000 (7500 * 2)
    $revenueByDay = $response->viewData('page')['props']['revenue_by_day'];

    $totalRevenue = collect($revenueByDay)->sum('total_amount');

    expect($totalRevenue)->toBe(15000.0);
});
