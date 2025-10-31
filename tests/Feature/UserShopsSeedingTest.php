<?php

use App\Models\User;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

it('seeds users with 1 to 2 shops attached', function () {
    // Run the full database seeder to ensure order and relations
    $this->seed(DatabaseSeeder::class);

    $users = User::query()->get();

    expect($users->count())->toBeGreaterThan(0);

    $users->each(function (User $user) {
        $count = $user->shops()->count();
        expect($count)->toBeGreaterThanOrEqual(1)
            ->and($count)->toBeLessThanOrEqual(2);
    });
});
