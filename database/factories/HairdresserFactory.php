<?php

namespace Database\Factories;

use App\Models\Shop;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Hairdresser>
 */
class HairdresserFactory extends Factory
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
            'name' => fake()->name(),
            'phone' => fake()->optional()->e164PhoneNumber(),
            'hire_date' => fake()->optional()->date(),
        ];
    }

    /**
     * Associate the hairdresser with a random existing shop or create one.
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
