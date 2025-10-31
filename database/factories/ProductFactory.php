<?php

namespace Database\Factories;

use App\Models\Shop;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Product>
 */
class ProductFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'shop_id' => null,
            'name' => fake()->unique()->words(3, true),
            'quantity' => fake()->numberBetween(0, 200),
            'description' => fake()->optional()->sentence(12),
            'price' => fake()->randomFloat(2, 1, 200),
        ];
    }

    /**
     * Associate the product with a given shop or a random existing shop.
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
