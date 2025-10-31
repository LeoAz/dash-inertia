<?php

namespace Database\Factories;

use App\Models\Shop;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\User>
 */
class UserFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'name' => fake()->name(),
            'username' => fake()->boolean(70) ? fake()->unique()->userName() : null,
            'email' => fake()->unique()->safeEmail(),
            'email_verified_at' => now(),
            'password' => Hash::make('password'),
            'remember_token' => Str::random(10),
        ];
    }

    /**
     * After creating hook to attach 1–2 shops.
     */
    public function configure(): static
    {
        return $this->afterCreating(function ($user) {
            // Fetch 1–2 random existing shops; if none exist, create one fallback
            $shopIds = Shop::query()->inRandomOrder()->limit(random_int(1, 2))->pluck('id');

            if ($shopIds->isEmpty()) {
                $shopIds = collect([Shop::factory()->create()->id]);
            }

            $user->shops()->syncWithoutDetaching($shopIds->all());
        });
    }

    /**
     * Indicate that the model's email address should be unverified.
     */
    public function unverified(): static
    {
        return $this->state(fn (array $attributes) => [
            'email_verified_at' => null,
        ]);
    }
}
