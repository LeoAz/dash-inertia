<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class HomeRedirectController extends Controller
{
    /**
     * Handle the incoming request.
     */
    public function __invoke(Request $request): RedirectResponse
    {
        /** @var User|null $user */
        $user = $request->user();

        if ($user === null) {
            // Unauthenticated users go to the login page (Fortify)
            return redirect()->route('login');
        }

        // Admins: redirect to admin area
        if ($user->hasRole('Super admin')) {
            return redirect()->route('admin.users.index');
        }

        if ($user->hasRole('admin')) {
            // Note: admin.users.index is restricted to Super admin in routes.
            // Send basic admins to shops listing to avoid 403.
            return redirect()->route('admin.shops.index');
        }

        // Vendors: redirect to their first (by id) associated shop dashboard
        $firstShop = $user->shops()->orderBy('shops.id')->first();
        if ($firstShop !== null) {
            return redirect()->route('shops.dashboard', ['shop' => $firstShop->id]);
        }

        // Fallback: if a user has no shop and is not admin, show info page and auto logout
        return redirect()->route('no-shop');
    }
}
