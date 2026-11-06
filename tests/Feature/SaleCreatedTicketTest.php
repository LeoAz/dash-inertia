<?php

use App\Models\Sale;
use App\Models\Service;
use App\Models\Shop;
use App\Models\User;
use Spatie\Permission\Models\Role;

it('flashes the stored sale so the printed ticket shows the real receipt number', function () {
    $shop = Shop::factory()->create();
    $user = User::factory()->create();
    $user->assignRole(Role::findOrCreate('Super admin'));
    $service = Service::factory()->for($shop)->create(['price' => 1500]);

    $response = $this->actingAs($user)->post(route('shops.sales.store', $shop), [
        'customer_name' => 'Client Ticket',
        'customer_phone' => '70000000',
        'sale_date' => now()->toDateTimeString(),
        'payment_method' => 'caisse',
        'services' => [['service_id' => $service->id, 'quantity' => 2]],
    ]);

    $response->assertRedirect(route('shops.sales.index', $shop));

    $sale = Sale::query()->with('receipt')->latest('id')->firstOrFail();
    $flashed = session('inertia.flash_data')['created_sale'];

    expect($flashed['id'])->toBe($sale->id)
        ->and($flashed['receipt_number'])->toBe($sale->receipt->receipt_number)
        ->and($flashed['details'][0]['quantity'])->toBe(2)
        ->and($flashed['details'][0]['line_subtotal'])->toEqual(3000.0);
});

it('returns service quantities so a sale can be edited', function () {
    $shop = Shop::factory()->create();
    $user = User::factory()->create();
    $user->assignRole(Role::findOrCreate('Super admin'));
    $service = Service::factory()->for($shop)->create(['price' => 1500]);

    $this->actingAs($user)->post(route('shops.sales.store', $shop), [
        'customer_name' => 'Client Edition',
        'customer_phone' => '70000001',
        'sale_date' => now()->toDateTimeString(),
        'payment_method' => 'caisse',
        'services' => [['service_id' => $service->id, 'quantity' => 3]],
    ]);

    $sale = Sale::query()->latest('id')->firstOrFail();

    $this->getJson(route('shops.sales.show', [$shop, $sale]))
        ->assertOk()
        ->assertJsonPath('services.0.quantity', 3);
});
