<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;

class UserSeeder extends Seeder
{
    /**
     * Seed the users table.
     */
    public function run(): void
    {
        // Create a batch of demo users with optional usernames
        User::factory()->count(15)->create();
    }
}
