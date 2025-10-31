<?php

namespace Database\Factories;

use App\Models\Receipt;
use App\Models\Sale;
use App\Models\Shop;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Carbon;
use Illuminate\Support\Str;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Receipt>
 */
class ReceiptFactory extends Factory
{
    /**
     * The name of the factory's corresponding model.
     *
     * @var class-string<\App\Models\Receipt>
     */
    protected $model = Receipt::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        // Ensure we have a sale associated to a shop (receipts require shop_id not nullable)
        $sale = Sale::query()->inRandomOrder()->first();
        if (! $sale) {
            $sale = Sale::factory()->forAnyShop()->forAnyUser()->create();
        } elseif (! $sale->shop_id) {
            // If the picked sale has no shop, ensure it does to satisfy receipts constraint
            $shopId = Shop::query()->inRandomOrder()->value('id') ?? Shop::factory()->create()->id;
            $sale->shop_id = $shopId;
            $sale->save();
        }

        $shopId = $sale->shop_id ?? (Shop::query()->inRandomOrder()->value('id') ?? Shop::factory()->create()->id);

        $userId = User::query()->inRandomOrder()->value('id') ?? User::factory()->create()->id;

        $saleDate = $sale->sale_date ? Carbon::parse($sale->sale_date) : Carbon::now();
        $generatedAt = $saleDate->copy()->setTime(fake()->numberBetween(8, 20), fake()->numberBetween(0, 59));

        $prefix = 'RC';
        $datePart = $saleDate->format('Ymd');
        $random = Str::upper(Str::random(5));
        $receiptNumber = sprintf('%s-%s-%s-%s', $prefix, $datePart, str_pad((string) $shopId, 2, '0', STR_PAD_LEFT), $random);

        return [
            'sale_id' => $sale->id,
            'shop_id' => $shopId,
            'receipt_number' => $receiptNumber,
            'generated_by' => $userId,
            'generated_at' => $generatedAt,
        ];
    }

    /**
     * Associate the receipt with a given or random existing shop.
     */
    public function forAnyShop(): static
    {
        return $this->state(function (array $attributes) {
            $shopId = Shop::query()->inRandomOrder()->value('id') ?? Shop::factory()->create()->id;

            return [
                'shop_id' => $shopId,
            ];
        });
    }

    /**
     * Associate the receipt with a given or random existing user as generator.
     */
    public function forAnyUser(): static
    {
        return $this->state(function (array $attributes) {
            $userId = User::query()->inRandomOrder()->value('id') ?? User::factory()->create()->id;

            return [
                'generated_by' => $userId,
            ];
        });
    }

    /**
     * Associate the receipt with a given or random existing sale; ensures shop consistency.
     */
    public function forAnySale(): static
    {
        return $this->state(function (array $attributes) {
            $sale = Sale::query()->inRandomOrder()->first() ?? Sale::factory()->forAnyShop()->forAnyUser()->create();
            $shopId = $sale->shop_id ?? (Shop::query()->inRandomOrder()->value('id') ?? Shop::factory()->create()->id);

            return [
                'sale_id' => $sale->id,
                'shop_id' => $shopId,
            ];
        });
    }
}
