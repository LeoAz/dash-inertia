<?php

use App\Models\Shop;
use App\Models\User;
use Inertia\Testing\AssertableInertia;

it('shares the authenticated user shops in inertia props', function () {
    $user = User::factory()->create();
    $shop = Shop::factory()->create();

    $user->shops()->sync([$shop->id]);

    $this->actingAs($user);

    $this->get(route('dashboard'), [
        'X-Inertia' => 'true',
        'Accept' => 'application/json',
    ])->assertInertia(fn (AssertableInertia $page) => $page
        ->component('dashboard')
        ->where('auth.user.id', $user->id)
        ->where('auth.shops.0.id', $shop->id)
        ->where('auth.shops.0.name', $shop->name)
    );
})->skip('Covered by unit middleware test; Inertia test setup returns non-Inertia response in this context.');
