<?php

use App\Models\Shop;
use App\Models\User;

test('guests are redirected to the login page', function () {
    $shop = Shop::factory()->create();
    $this->get(route('shops.dashboard', $shop))->assertRedirect(route('login'));
});

test('authenticated users can visit the dashboard', function () {
    $shop = Shop::factory()->create();
    $this->actingAs($user = User::factory()->create());

    $this->get(route('shops.dashboard', $shop))->assertOk();
});
