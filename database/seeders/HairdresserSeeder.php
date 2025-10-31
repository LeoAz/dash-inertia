<?php

namespace Database\Seeders;

use App\Models\Hairdresser;
use App\Models\Shop;
use Illuminate\Database\Seeder;

class HairdresserSeeder extends Seeder
{
    /**
     * Seed the hairdressers table.
     */
    public function run(): void
    {
        $shops = Shop::all();

        if ($shops->isNotEmpty()) {
            foreach ($shops as $shop) {
                Hairdresser::factory()
                    ->count(4)
                    ->state(['shop_id' => $shop->id])
                    ->create();
            }
        } else {
            Hairdresser::factory()->count(12)->create();
        }
    }
}
