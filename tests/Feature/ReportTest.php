<?php

use App\Models\Shop;
use App\Models\User;
use Maatwebsite\Excel\Facades\Excel;

it('can export product sales report', function () {
    $user = User::factory()->create();
    $shop = Shop::factory()->create();
    $user->shops()->attach($shop);

    Excel::fake();

    $response = $this->actingAs($user)
        ->get(route('shops.reports.products.export', ['shop' => $shop]));

    $response->assertStatus(200);
    Excel::assertDownloaded("rapport-ventes-produits-{$shop->id}.xlsx");
});

it('can export service sales report', function () {
    $user = User::factory()->create();
    $shop = Shop::factory()->create();
    $user->shops()->attach($shop);

    Excel::fake();

    $response = $this->actingAs($user)
        ->get(route('shops.reports.services.export', ['shop' => $shop]));

    $response->assertStatus(200);
    Excel::assertDownloaded("rapport-ventes-services-{$shop->id}.xlsx");
});

it('can export clients report', function () {
    $user = User::factory()->create();
    $shop = Shop::factory()->create();
    $user->shops()->attach($shop);

    Excel::fake();

    $response = $this->actingAs($user)
        ->get(route('shops.reports.clients.export', ['shop' => $shop]));

    $response->assertStatus(200);
    Excel::assertDownloaded("rapport-clients-{$shop->id}.xlsx");
});

it('can export hairdressers report', function () {
    $user = User::factory()->create();
    $shop = Shop::factory()->create();
    $user->shops()->attach($shop);

    Excel::fake();

    $response = $this->actingAs($user)
        ->get(route('shops.reports.hairdressers.export', ['shop' => $shop]));

    $response->assertStatus(200);
    Excel::assertDownloaded("rapport-coiffeurs-{$shop->id}.xlsx");
});
