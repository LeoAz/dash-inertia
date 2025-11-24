<?php

namespace App\Providers;

use App\Actions\Fortify\CreateNewUser;
use App\Actions\Fortify\ResetUserPassword;
use App\Models\User;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Laravel\Fortify\Contracts\LoginResponse;
use Laravel\Fortify\Features;
use Laravel\Fortify\Fortify;

class FortifyServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        // Custom login response to handle role-based redirects
        $this->app->instance(LoginResponse::class, new class implements LoginResponse
        {
            public function toResponse($request)
            {
                /** @var \App\Models\User $user */
                $user = $request->user();

                // Vendors without any shop: show dedicated page with modal + auto-logout
                if ($user->hasRole('vendeur') && $user->shops()->count() === 0) {
                    return redirect()->route('no-shop');
                }

                if ($user->hasRole('Super admin') || $user->hasRole('admin')) {
                    return redirect()->route('admin.shops.index');
                }

                if ($user->hasRole('vendeur')) {
                    $firstShop = $user->shops()->orderBy('shops.id')->first();
                    if ($firstShop !== null) {
                        return redirect()->route('shops.sales.index', ['shop' => $firstShop->id]);
                    }

                    // Fallback safety (should be caught above)
                    return redirect()->route('no-shop');
                }

                // Utilisateurs sans rôle explicite
                // S'ils ont une boutique assignée, rediriger vers le dashboard de la première boutique
                $firstShop = $user->shops()->orderBy('shops.id')->first();
                if ($firstShop !== null) {
                    return redirect()->route('shops.dashboard', ['shop' => $firstShop->id]);
                }

                // Sinon, rediriger vers la page dédiée "no-shop"
                return redirect()->route('no-shop');
            }
        });
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        $this->configureActions();
        $this->configureViews();
        $this->configureRateLimiting();

        // Authenticate using username (pseudo) only
        Fortify::authenticateUsing(function (Request $request) {
            $usernameField = Fortify::username();
            $username = (string) $request->input($usernameField);
            $password = (string) $request->input('password');

            if ($username === '' || $password === '') {
                return null;
            }

            /** @var User|null $user */
            $user = User::query()->where('username', $username)->first();

            if ($user === null || ! Hash::check($password, $user->password)) {
                return null; // let Fortify handle invalid credentials message
            }

            return $user;
        });
    }

    /**
     * Configure Fortify actions.
     */
    private function configureActions(): void
    {
        Fortify::resetUserPasswordsUsing(ResetUserPassword::class);
        Fortify::createUsersUsing(CreateNewUser::class);
    }

    /**
     * Configure Fortify views.
     */
    private function configureViews(): void
    {
        Fortify::loginView(fn (Request $request) => Inertia::render('auth/login', [
            'canResetPassword' => Features::enabled(Features::resetPasswords()),
            'canRegister' => Features::enabled(Features::registration()),
            'status' => $request->session()->get('status'),
        ]));

        Fortify::resetPasswordView(fn (Request $request) => Inertia::render('auth/reset-password', [
            'email' => $request->email,
            'token' => $request->route('token'),
        ]));

        Fortify::requestPasswordResetLinkView(fn (Request $request) => Inertia::render('auth/forgot-password', [
            'status' => $request->session()->get('status'),
        ]));

        Fortify::verifyEmailView(fn (Request $request) => Inertia::render('auth/verify-email', [
            'status' => $request->session()->get('status'),
        ]));

        Fortify::registerView(fn () => Inertia::render('auth/register'));

        Fortify::confirmPasswordView(fn () => Inertia::render('auth/confirm-password'));
    }

    /**
     * Configure rate limiting.
     */
    private function configureRateLimiting(): void
    {
        RateLimiter::for('login', function (Request $request) {
            $throttleKey = Str::transliterate(Str::lower($request->input(Fortify::username())).'|'.$request->ip());

            return Limit::perMinute(5)->by($throttleKey);
        });
    }
}
