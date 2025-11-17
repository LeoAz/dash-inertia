<?php

use App\Http\Middleware\HandleInertiaRequests;
use App\Models\Shop;
use App\Models\User;
use Illuminate\Http\Request;

it('shares shops for the authenticated user', function () {
    $user = User::factory()->create();
    $shops = Shop::factory()->count(2)->create();
    $user->shops()->sync($shops->pluck('id')->all());

    $request = Request::create('/', 'GET');
    $request->setUserResolver(fn () => $user);

    $middleware = app(HandleInertiaRequests::class);

    $shared = $middleware->share($request);

    expect($shared)
        ->toHaveKey('auth')
        ->and($shared['auth'])
        ->toHaveKeys(['user', 'shops'])
        ->and($shared['auth']['user']->id)
        ->toBe($user->id)
        ->and($shared['auth']['shops'])
        ->toBeArray()
        ->and(count($shared['auth']['shops']))
        ->toBe(2)
        ->and(collect($shared['auth']['shops'])->pluck('id')->sort()->values()->all())
        ->toEqualCanonicalizing($shops->pluck('id')->sort()->values()->all());
});

it('shares user roles for the authenticated user', function () {
    $user = User::factory()->create();
    // Assign a role
    \Spatie\Permission\Models\Role::findOrCreate('vendeur');
    $user->assignRole('vendeur');

    $request = Request::create('/', 'GET');
    $request->setUserResolver(fn () => $user);

    $middleware = app(HandleInertiaRequests::class);
    $shared = $middleware->share($request);

    expect($shared['auth']['user']->roles)
        ->toBeArray()
        ->toContain('vendeur');
});
