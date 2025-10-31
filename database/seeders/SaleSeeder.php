<?php

namespace Database\Seeders;

use App\Models\Hairdresser;
use App\Models\Product;
use App\Models\Promotion;
use App\Models\Sale;
use App\Models\Service;
use App\Models\Shop;
use App\Models\User;
use Illuminate\Database\Seeder;

class SaleSeeder extends Seeder
{
    /**
     * Seed the sales table with product/service line items and optional promotions.
     */
    public function run(): void
    {
        $shops = Shop::all();

        if ($shops->isEmpty()) {
            // No shops: create some unattached sales using any available products/services
            $this->seedUnattachedSales();

            return;
        }

        foreach ($shops as $shop) {
            $products = Product::query()->where('shop_id', $shop->id)->get();
            $services = Service::query()->where('shop_id', $shop->id)->get();

            // Ensure there is at least some catalog for this shop
            if ($products->isEmpty()) {
                $products = Product::factory()->count(5)->state(['shop_id' => $shop->id])->create();
            }
            if ($services->isEmpty()) {
                $services = Service::factory()->count(2)->state(['shop_id' => $shop->id])->create();
            }

            // Ensure we have hairdressers and promotions for this shop
            if (! Hairdresser::query()->where('shop_id', $shop->id)->exists()) {
                Hairdresser::factory()->count(2)->state(['shop_id' => $shop->id])->create();
            }
            if (! Promotion::query()->where('shop_id', $shop->id)->exists()) {
                // create a basic active percentage promo
                Promotion::factory()->state([
                    'shop_id' => $shop->id,
                    'active' => true,
                    'percentage' => 10,
                    'amount' => 0,
                    'starts_at' => now()->subDays(10)->toDateString(),
                    'ends_at' => now()->addDays(20)->toDateString(),
                ])->create();
            }

            $salesCount = random_int(8, 12);

            for ($i = 0; $i < $salesCount; $i++) {
                $sale = Sale::factory()
                    ->forAnyShop()
                    ->forAnyUser()
                    ->withAnyHairdresser()
                    ->state(['shop_id' => $shop->id])
                    ->create();

                $total = 0.0;

                // Attach products (1-4)
                $productItems = $products->shuffle()->take(random_int(1, 4));
                foreach ($productItems as $product) {
                    $qty = random_int(1, 3);
                    $unit = (float) $product->price;
                    $subtotal = round($qty * $unit, 2);
                    $sale->products()->attach($product->id, [
                        'quantity' => $qty,
                        'unit_price' => $unit,
                        'subtotal' => $subtotal,
                    ]);
                    $total += $subtotal;
                }

                // Attach services (0-2)
                $serviceItems = $services->shuffle()->take(random_int(0, 2));
                foreach ($serviceItems as $service) {
                    $unit = (float) $service->price;
                    $subtotal = round($unit, 2);
                    $sale->services()->attach($service->id, [
                        'unit_price' => $unit,
                        'subtotal' => $subtotal,
                    ]);
                    $total += $subtotal;
                }

                // Set total
                $sale->total_amount = round($total, 2);

                // Try to apply an eligible promotion (50% chance)
                if (random_int(0, 1) === 1) {
                    $promotion = $shop->activePromotionForDate($sale->sale_date);
                    try {
                        $sale->applyPromotion($promotion);
                    } catch (\Illuminate\Validation\ValidationException $e) {
                        // If ineligible (e.g., no eligible items), ignore and continue without promo
                        $sale->promotion_id = null;
                        $sale->discount_amount = null;
                    }
                }

                $sale->save();
            }
        }
    }

    protected function seedUnattachedSales(): void
    {
        $products = Product::all();
        $services = Service::all();

        if ($products->isEmpty()) {
            $products = Product::factory()->count(10)->create();
        }
        if ($services->isEmpty()) {
            $services = Service::factory()->count(5)->create();
        }

        $userId = User::query()->inRandomOrder()->value('id') ?? User::factory()->create()->id;

        for ($i = 0; $i < 10; $i++) {
            $sale = Sale::factory()->state([
                'user_id' => $userId,
            ])->create();

            $total = 0.0;

            foreach ($products->shuffle()->take(random_int(1, 3)) as $product) {
                $qty = random_int(1, 3);
                $unit = (float) $product->price;
                $subtotal = round($qty * $unit, 2);
                $sale->products()->attach($product->id, [
                    'quantity' => $qty,
                    'unit_price' => $unit,
                    'subtotal' => $subtotal,
                ]);
                $total += $subtotal;
            }

            foreach ($services->shuffle()->take(random_int(0, 2)) as $service) {
                $unit = (float) $service->price;
                $subtotal = round($unit, 2);
                $sale->services()->attach($service->id, [
                    'unit_price' => $unit,
                    'subtotal' => $subtotal,
                ]);
                $total += $subtotal;
            }

            $sale->total_amount = round($total, 2);
            $sale->save();
        }
    }
}
