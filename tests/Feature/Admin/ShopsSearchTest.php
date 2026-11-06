<?php

use App\Models\Shop;
use App\Models\User;
use Spatie\Permission\Models\Role;

it('filters shops by the search query', function () {
    $user = User::factory()->create();
    $user->assignRole(Role::findOrCreate('Super admin'));

    Shop::factory()->create(['name' => 'Alpha Market']);
    Shop::factory()->create(['name' => 'Beta Store']);
    Shop::factory()->create(['name' => 'Gamma Boutique']);

    $this->actingAs($user);

    $response = $this->get(route('admin.shops.index', ['search' => 'Alpha']));

    $response->assertSuccessful();
    $response->assertSee('Alpha Market');
    $response->assertDontSee('Beta Store');
    $response->assertDontSee('Gamma Boutique');
});
