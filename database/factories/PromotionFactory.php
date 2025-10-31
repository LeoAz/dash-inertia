<?php

namespace Database\Factories;

use App\Models\Shop;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Carbon;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Promotion>
 */
class PromotionFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $start = fake()->optional(0.6)->dateTimeBetween('-30 days', '+10 days');
        $end = $start ? Carbon::parse($start)->copy()->addDays(fake()->numberBetween(5, 60)) : null;

        // Randomly choose between percentage discount and fixed amount
        $usePercentage = fake()->boolean(70);

        // Random days of week (or null)
        $dow = null;
        if (fake()->boolean(30)) {
            $dow = collect(range(0, 6))
                ->random(fake()->numberBetween(1, 3))
                ->values()
                ->all();
        }

        return [
            'shop_id' => null,
            'name' => fake()->catchPhrase(),
            'percentage' => $usePercentage ? fake()->randomFloat(2, 5, 40) : 0,
            'amount' => $usePercentage ? 0 : fake()->numberBetween(500, 5000),
            'days_of_week' => $dow,
            'active' => fake()->boolean(85),
            'applicable_to_products' => fake()->boolean(80),
            'applicable_to_services' => fake()->boolean(80),
            'starts_at' => $start ? Carbon::parse($start)->toDateString() : null,
            'ends_at' => $end ? $end->toDateString() : null,
        ];
    }

    /**
     * Associate the promotion with a random existing shop or a new one.
     */
    public function forAnyShop(): static
    {
        return $this->state(function (array $attributes) {
            $shopId = Shop::query()->inRandomOrder()->value('id');

            return [
                'shop_id' => $shopId ?? Shop::factory(),
            ];
        });
    }
}
