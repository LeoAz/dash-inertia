<?php

namespace Database\Seeders;

use App\Models\Shop;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // 1) Seed shops first so we can attach them to users
        $this->call([
            ShopSeeder::class,
        ]);

        // 2) Create a default test user and attach 1–2 random shops
        $testUser = User::firstOrCreate(
            ['email' => 'test@example.com'],
            [
                'name' => 'Test User',
                'username' => 'testuser',
                'password' => Hash::make('password'),
                'email_verified_at' => now(),
            ]
        );

        $shopIds = Shop::query()->inRandomOrder()->limit(random_int(1, 2))->pluck('id')->all();
        if (! empty($shopIds)) {
            $testUser->shops()->syncWithoutDetaching($shopIds);
        }

        // 3) Seed roles and assign Super admin to the first user
        $this->call([
            RolesSeeder::class,
        ]);

        // 3b) Create one account per remaining role, to test each level of access
        foreach (['admin' => 'Admin Test', 'vendeur' => 'Vendeur Test'] as $role => $name) {
            $roleUser = User::firstOrCreate(
                ['email' => "{$role}@example.com"],
                [
                    'name' => $name,
                    'username' => $role,
                    'password' => Hash::make('password'),
                    'email_verified_at' => now(),
                ]
            );

            $roleUser->assignRole($role);
            $roleUser->shops()->syncWithoutDetaching(Shop::query()->orderBy('id')->limit(2)->pluck('id')->all());
        }

        // 4) Seed additional users (factory will attach 1–2 shops automatically)
        $this->call([
            UserSeeder::class,
        ]);

        // 5) Seed remaining demo data
        $this->call([
            HairdresserSeeder::class,
            ProductSeeder::class,
            ServiceSeeder::class,
            PromotionSeeder::class,
            SaleSeeder::class,
            ReceiptSeeder::class,
        ]);
    }
}
