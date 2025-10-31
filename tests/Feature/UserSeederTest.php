<?php

use App\Models\User;
use Database\Seeders\UserSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;

uses(RefreshDatabase::class);

it('seeds users using UserSeeder', function () {
    expect(User::count())->toBe(0);

    $this->seed(UserSeeder::class);

    expect(User::count())->toBeGreaterThan(0);
});

it('seeds users with hashed passwords and unique emails', function () {
    $this->seed(UserSeeder::class);

    $users = User::all();
    expect($users->count())->toBeGreaterThan(0);

    // Ensure emails are unique
    $uniqueEmails = $users->pluck('email')->unique();
    expect($uniqueEmails->count())->toBe($users->count());

    // Ensure at least one user has a password that matches "password" when checked via Hash
    $matched = $users->contains(function (User $u) {
        return Hash::check('password', $u->password);
    });

    expect($matched)->toBeTrue();
});
