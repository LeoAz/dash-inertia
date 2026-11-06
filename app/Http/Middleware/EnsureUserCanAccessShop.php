<?php

namespace App\Http\Middleware;

use App\Models\Shop;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureUserCanAccessShop
{
    /**
     * Refuse every shop-scoped page to users who are not attached to that shop.
     *
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $shop = $request->route('shop');
        $shopId = $shop instanceof Shop ? $shop->getKey() : $shop;

        abort_unless($request->user()?->canAccessShop($shopId) ?? false, 403);

        return $next($request);
    }
}
