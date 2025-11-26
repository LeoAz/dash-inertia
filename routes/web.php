<?php

use App\Http\Controllers\DashboardController;
use App\Http\Controllers\HairdresserController;
use App\Http\Controllers\HomeRedirectController;
use App\Http\Controllers\ProductController;
use App\Http\Controllers\PromotionController;
use App\Http\Controllers\ReportController;
use App\Http\Controllers\SaleController;
use App\Http\Controllers\ServiceController;
use App\Http\Controllers\ShopController;
use App\Http\Controllers\UserController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

// Redirection d'accueil sans logique dans ce fichier: déléguée au contrôleur invocable
Route::get('/', HomeRedirectController::class)->name('home');

Route::middleware(['auth', 'verified'])->group(function () {
    // Menus d'accueil
    Route::get('/home-menu', fn () => Inertia::render('home-menu'))
        ->name('home.menu');

    // Page affichée aux utilisateurs sans boutique associée
    Route::get('no-shop', function () {
        return Inertia::render('auth/no-shop');
    })->name('no-shop');

    Route::prefix('shops/{shop}')
        ->as('shops.')
        ->group(function () {
            // Shop scoped shop-menu
            Route::get('shop-menu', fn ($shop) => Inertia::render('shop-menu'))
                ->name('shop-menu');
            Route::get('dashboard', [DashboardController::class, 'index'])->name('dashboard');

            Route::resource('products', ProductController::class);
            Route::resource('services', ServiceController::class);
            Route::resource('hairdressers', HairdresserController::class);
            Route::resource('promotions', PromotionController::class);
            // Sales routes
            Route::get('sales/history', [SaleController::class, 'history'])->name('sales.history');
            // Client suggestions for autocomplete (name & phone)
            Route::get('sales/client-suggestions', [SaleController::class, 'clientSuggestions'])
                ->name('sales.client-suggestions');
            Route::resource('sales', SaleController::class)->only(['index', 'store', 'update', 'show', 'destroy']);

            // Reports routes
            Route::prefix('reports')->as('reports.')->group(function () {
                ReportController::routes();
            });
        });

    // Admin CRUD (top-level admin scope)
    Route::prefix('admin')->as('admin.')->group(function () {
        Route::resource('shops', ShopController::class);
        Route::resource('users', UserController::class)->middleware('role:Super admin');
    });
});

require __DIR__.'/settings.php';
