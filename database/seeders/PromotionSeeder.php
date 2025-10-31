<?php

namespace Database\Seeders;

use App\Models\Promotion;
use App\Models\Shop;
use Illuminate\Database\Seeder;

class PromotionSeeder extends Seeder
{
    /**
     * Seed the promotions table.
     */
    public function run(): void
    {
        $shops = Shop::all();

        if ($shops->isEmpty()) {
            return; // requires shops; DatabaseSeeder calls ShopSeeder first
        }

        foreach ($shops as $shop) {
            // General percentage off, active, both products and services
            Promotion::factory()->state([
                'shop_id' => $shop->id,
                'name' => 'Promo Générale',
                'percentage' => fake()->randomFloat(2, 5, 20),
                'amount' => 0,
                'days_of_week' => null,
                'active' => true,
                'applicable_to_products' => true,
                'applicable_to_services' => true,
                'starts_at' => now()->subDays(10)->toDateString(),
                'ends_at' => now()->addDays(20)->toDateString(),
            ])->create();

            // Weekend products-only
            Promotion::factory()->state([
                'shop_id' => $shop->id,
                'name' => 'Promo Week-end Produits',
                'percentage' => fake()->randomFloat(2, 10, 30),
                'amount' => 0,
                'days_of_week' => [6, 0], // Sat, Sun
                'active' => true,
                'applicable_to_products' => true,
                'applicable_to_services' => false,
                'starts_at' => now()->subDays(5)->toDateString(),
                'ends_at' => now()->addDays(30)->toDateString(),
            ])->create();

            // Services-only fixed amount within 30-day window
            Promotion::factory()->state([
                'shop_id' => $shop->id,
                'name' => 'Remise Services',
                'percentage' => 0,
                'amount' => fake()->numberBetween(500, 2000), // in currency units per migration (integer)
                'days_of_week' => null,
                'active' => true,
                'applicable_to_products' => false,
                'applicable_to_services' => true,
                'starts_at' => now()->subDays(3)->toDateString(),
                'ends_at' => now()->addDays(27)->toDateString(),
            ])->create();
        }
    }
}
