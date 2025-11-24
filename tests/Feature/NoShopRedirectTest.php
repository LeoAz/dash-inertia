<?php

use App\Models\User;

it('redirige un utilisateur sans boutique vers la page no-shop', function (): void {
    $user = User::factory()->create();

    $this->actingAs($user);

    $response = $this->get('/');

    $response->assertRedirect(route('no-shop'));
});
