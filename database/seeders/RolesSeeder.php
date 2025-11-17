<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

class RolesSeeder extends Seeder
{
    /**
     * Seed roles and assign Super admin to the first user.
     */
    public function run(): void
    {
        // Ensure the Spatie permission cache is cleared
        app(PermissionRegistrar::class)->forgetCachedPermissions();

        // Create roles if they don't exist (idempotent)
        $guard = 'web';
        $roles = [
            'Super admin',
            'admin',
            'vendeur',
        ];

        foreach ($roles as $roleName) {
            Role::firstOrCreate([
                'name' => $roleName,
                'guard_name' => $guard,
            ]);
        }

        // Assign Super admin to the very first user if available
        $firstUser = User::query()->orderBy('id')->first();
        if ($firstUser !== null && ! $firstUser->hasRole('Super admin')) {
            $firstUser->assignRole('Super admin');
        }

        // Clear cache again to be safe
        app(PermissionRegistrar::class)->forgetCachedPermissions();
    }
}
