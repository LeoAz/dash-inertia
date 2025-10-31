<?php

namespace Database\Seeders;

use App\Models\Shop;
use Illuminate\Database\Seeder;

class ShopSeeder extends Seeder
{
    /**
     * Seed the shops table.
     */
    public function run(): void
    {
        // Create a handful of demo shops
        Shop::factory()->count(5)->create();
    }
}
