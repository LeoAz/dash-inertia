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
                'password' => Hash::make('password'),
                'email_verified_at' => now(),
            ]
        );

        $shopIds = Shop::query()->inRandomOrder()->limit(random_int(1, 2))->pluck('id')->all();
        if (! empty($shopIds)) {
            $testUser->shops()->syncWithoutDetaching($shopIds);
        }

        // 3) Seed additional users (factory will attach 1–2 shops automatically)
        $this->call([
            UserSeeder::class,
        ]);

        // 4) Seed remaining demo data
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
