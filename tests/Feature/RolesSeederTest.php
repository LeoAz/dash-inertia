<?php

use App\Models\User;
use Database\Seeders\RolesSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;

uses(RefreshDatabase::class);

it('seeds three roles and assigns Super admin to the first user', function () {
    // Create two users; the first created should receive the Super admin role
    $first = User::factory()->create();
    $second = User::factory()->create();

    // Run the seeder
    $this->seed(RolesSeeder::class);

    // Roles exist
    expect(Role::query()->where('name', 'Super admin')->exists())->toBeTrue();
    expect(Role::query()->where('name', 'admin')->exists())->toBeTrue();
    expect(Role::query()->where('name', 'vendeur')->exists())->toBeTrue();

    // First user has Super admin role
    expect($first->fresh()->hasRole('Super admin'))->toBeTrue();

    // Second user should not automatically get the role
    expect($second->fresh()->hasRole('Super admin'))->toBeFalse();
});
