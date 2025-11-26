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

        // Super admin: aller au Home-menu
        if ($user->hasRole('Super admin')) {
            return redirect()->route('home.menu');
        }

        // Admin: aller également au Home-menu
        if ($user->hasRole('admin')) {
            return redirect()->route('home.menu');
        }

        // Vendeur: aller au Shop-menu (menus orientés boutique), shop-scoped
        if ($user->hasRole('vendeur')) {
            $firstShop = $user->shops()->orderBy('shops.id')->first();
            if ($firstShop !== null) {
                return redirect()->route('shops.shop-menu', ['shop' => $firstShop->id]);
            }

            // Pas de boutique associée
            return redirect()->route('no-shop');
        }

        // Autres rôles: rediriger vers la première boutique (comportement existant)
        $firstShop = $user->shops()->orderBy('shops.id')->first();
        if ($firstShop !== null) {
            return redirect()->route('shops.dashboard', ['shop' => $firstShop->id]);
        }

        // Fallback: if a user has no shop and is not admin, show info page and auto logout
        return redirect()->route('no-shop');
    }
}
