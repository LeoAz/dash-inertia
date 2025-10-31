<?php

namespace Database\Factories;

use App\Models\Shop;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Service>
 */
class ServiceFactory extends Factory
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
            'name' => fake()->unique()->words(2, true),
            'description' => fake()->optional()->sentence(12),
            'price' => fake()->randomFloat(2, 5, 300),
        ];
    }

    /**
     * Associate the service with a random existing shop or a new one.
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
