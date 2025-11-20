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
use Illuminate\Validation\ValidationException;
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

                if ($user->hasRole('Super admin') || $user->hasRole('admin')) {
                    return redirect()->route('admin.shops.index');
                }

                if ($user->hasRole('vendeur')) {
                    $firstShop = $user->shops()->orderBy('shops.id')->first();
                    if ($firstShop !== null) {
                        return redirect()->route('shops.sales.index', ['shop' => $firstShop->id]);
                    }

                    // If somehow authenticated vendor without shop reaches here, send back to login
                    return redirect()->route('login')->withErrors([
                        Fortify::username() => __('Votre compte vendeur n\'est lié à aucune boutique. Veuillez contacter un administrateur.'),
                    ]);
                }

                // Fallback to Fortify home if no known role
                return redirect(config('fortify.home'));
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

            // If the user is a vendor but has no shop, block login with a clear message
            if ($user->hasRole('vendeur') && $user->shops()->count() === 0) {
                throw ValidationException::withMessages([
                    $usernameField => __('Votre compte vendeur n\'est lié à aucune boutique. Veuillez contacter un administrateur.'),
                ]);
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
