<?php

namespace Database\Factories;

use App\Models\Hairdresser;
use App\Models\Shop;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Sale>
 */
class SaleFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $status = fake()->randomElement(['En attente', 'Attribué']);

        return [
            'uuid' => (string) Str::uuid(),
            'shop_id' => null,
            'user_id' => null,
            'customer_name' => fake()->name(),
            'customer_phone' => fake()->e164PhoneNumber(),
            'sale_date' => fake()->dateTimeBetween('-30 days', 'now')->format('Y-m-d'),
            'total_amount' => 0,
            'status' => $status,
            'hairdresser_id' => null,
            'promotion_id' => null,
            'discount_amount' => null,
        ];
    }

    /**
     * Associate with any existing shop.
     */
    public function forAnyShop(): static
    {
        return $this->state(function () {
            $shopId = Shop::query()->inRandomOrder()->value('id');

            return [
                'shop_id' => $shopId ?? Shop::factory(),
            ];
        });
    }

    /**
     * Associate with any existing user.
     */
    public function forAnyUser(): static
    {
        return $this->state(function () {
            $userId = User::query()->inRandomOrder()->value('id');

            return [
                'user_id' => $userId ?? User::factory(),
            ];
        });
    }

    /**
     * Associate with any existing hairdresser.
     */
    public function withAnyHairdresser(): static
    {
        return $this->state(function () {
            $hairdresserId = Hairdresser::query()->inRandomOrder()->value('id');

            return [
                'hairdresser_id' => $hairdresserId ?? Hairdresser::factory(),
            ];
        });
    }
}
