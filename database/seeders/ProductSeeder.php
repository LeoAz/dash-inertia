<?php

namespace Database\Seeders;

use App\Models\Product;
use App\Models\Shop;
use Illuminate\Database\Seeder;

class ProductSeeder extends Seeder
{
    /**
     * Seed the products table.
     */
    public function run(): void
    {
        // If there are shops, distribute products across them; otherwise just create unattached products
        $shops = Shop::all();

        if ($shops->isNotEmpty()) {
            foreach ($shops as $shop) {
                Product::factory()
                    ->count(6)
                    ->state(['shop_id' => $shop->id])
                    ->create();
            }
        } else {
            Product::factory()->count(30)->create();
        }
    }
}
