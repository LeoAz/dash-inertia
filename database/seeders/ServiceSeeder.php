<?php

namespace Database\Seeders;

use App\Models\Service;
use App\Models\Shop;
use Illuminate\Database\Seeder;

class ServiceSeeder extends Seeder
{
    /**
     * Seed the services table.
     */
    public function run(): void
    {
        $shops = Shop::all();

        if ($shops->isNotEmpty()) {
            foreach ($shops as $shop) {
                Service::factory()
                    ->count(3)
                    ->state(['shop_id' => $shop->id])
                    ->create();
            }
        } else {
            Service::factory()->count(15)->create();
        }
    }
}
