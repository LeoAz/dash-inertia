<?php

use App\Models\Shop;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;

uses(RefreshDatabase::class);

function actingAsWithRole(string $roleName): User
{
    $user = User::factory()->create(['email_verified_at' => now()]);
    Role::findOrCreate($roleName);
    $user->assignRole($roleName);
    test()->actingAs($user);

    return $user;
}

it('denies access to users CRUD for non superadmin', function () {
    actingAsWithRole('admin');

    $this->get(route('admin.users.index'))->assertForbidden();
});

it('lists users for superadmin', function () {
    actingAsWithRole('Super admin');

    $this->get(route('admin.users.index'))->assertSuccessful();
});

it('validates on store (password min and confirmed, unique email)', function () {
    actingAsWithRole('Super admin');

    $payload = [
        'name' => 'John',
        'email' => 'john@example.com',
        'password' => 'short', // 5 chars
        'password_confirmation' => 'shortx',
        'role' => 'vendeur',
    ];

    $this->post(route('admin.users.store'), $payload)
        ->assertSessionHasErrors(['password']);

    // Create a user to assert unique email
    User::factory()->create(['email' => 'john@example.com']);

    $payload = [
        'name' => 'John',
        'email' => 'john@example.com',
        'password' => 'secret6',
        'password_confirmation' => 'secret6',
        'role' => 'vendeur',
    ];

    $this->post(route('admin.users.store'), $payload)
        ->assertSessionHasErrors(['email']);
});

it('creates a vendeur with one assigned shop', function () {
    actingAsWithRole('Super admin');
    $shop = Shop::factory()->create();

    $payload = [
        'name' => 'Seller',
        'email' => 'seller@example.com',
        'password' => 'secret6',
        'password_confirmation' => 'secret6',
        'role' => 'vendeur',
        'shop_id' => $shop->id,
    ];

    $this->post(route('admin.users.store'), $payload)
        ->assertRedirect(route('admin.users.index'));

    $user = User::whereEmail('seller@example.com')->first();
    expect($user)->not->toBeNull();
    expect($user->hasRole('vendeur'))->toBeTrue();
    expect($user->shops()->pluck('shops.id')->all())->toBe([$shop->id]);
});

it('creates an admin with multiple shops', function () {
    actingAsWithRole('Super admin');
    $shops = Shop::factory()->count(2)->create();

    $payload = [
        'name' => 'Admin',
        'email' => 'admin2@example.com',
        'password' => 'secret6',
        'password_confirmation' => 'secret6',
        'role' => 'admin',
        'shop_ids' => $shops->pluck('id')->all(),
    ];

    $this->post(route('admin.users.store'), $payload)
        ->assertRedirect(route('admin.users.index'));

    $user = User::whereEmail('admin2@example.com')->first();
    expect($user)->not->toBeNull();
    expect($user->hasRole('admin'))->toBeTrue();
    expect($user->shops()->pluck('shops.id')->sort()->values()->all())
        ->toBe($shops->pluck('id')->sort()->values()->all());
});

it('updates a user role and shops', function () {
    actingAsWithRole('Super admin');
    $user = User::factory()->create(['email' => 'u@example.com']);
    Role::findOrCreate('vendeur');
    $user->assignRole('vendeur');

    $shopA = Shop::factory()->create();
    $shopB = Shop::factory()->create();
    $user->shops()->sync([$shopA->id]);

    // Promote to admin and attach multiple shops
    $payload = [
        'role' => 'admin',
        'shop_ids' => [$shopA->id, $shopB->id],
    ];

    $this->put(route('admin.users.update', $user), $payload)
        ->assertRedirect(route('admin.users.index'));

    $user->refresh();
    expect($user->hasRole('admin'))->toBeTrue();
    expect($user->shops()->pluck('shops.id')->sort()->values()->all())
        ->toBe(collect([$shopA->id, $shopB->id])->sort()->values()->all());
});

it('prevents deleting self and prevents admin deleting superadmin', function () {
    // Self delete
    $super = actingAsWithRole('Super admin');
    $this->delete(route('admin.users.destroy', $super))->assertForbidden();

    // Admin cannot delete super admin
    $target = User::factory()->create();
    Role::findOrCreate('Super admin');
    $target->assignRole('Super admin');

    $admin = actingAsWithRole('admin');

    $this->delete(route('admin.users.destroy', $target))->assertForbidden();
});
