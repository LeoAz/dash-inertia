<?php

use App\Http\Controllers\DashboardController;
use App\Http\Controllers\HairdresserController;
use App\Http\Controllers\ProductController;
use App\Http\Controllers\PromotionController;
use App\Http\Controllers\SaleController;
use App\Http\Controllers\ServiceController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use Laravel\Fortify\Features;

Route::get('/', function () {
    return Inertia::render('welcome', [
        'canRegister' => Features::enabled(Features::registration()),
    ]);
})->name('home');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('dashboard', function () {
        return Inertia::render('dashboard');
    })->name('dashboard');

    Route::prefix('shops/{shop}')
        ->as('shops.')
        ->group(function () {
            // Shop dashboard
            Route::get('dashboard', [DashboardController::class, 'index'])->name('dashboard');

            Route::resource('products', ProductController::class);
            Route::resource('services', ServiceController::class);
            Route::resource('hairdressers', HairdresserController::class);
            Route::resource('promotions', PromotionController::class);
            // Sales routes
            Route::get('sales/history', [SaleController::class, 'history'])->name('sales.history');
            Route::resource('sales', SaleController::class)->only(['index', 'store', 'update', 'show', 'destroy']);

            // Reports routes
            Route::prefix('reports')->as('reports.')->group(function () {
                \App\Http\Controllers\ReportController::routes();
            });
        });
});

require __DIR__.'/settings.php';
