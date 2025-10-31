<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

class Shop extends Model
{
    /** @use HasFactory<\Database\Factories\ShopFactory> */
    use HasFactory;

    public function products(): HasMany
    {
        return $this->hasMany(Product::class);
    }

    public function services(): HasMany
    {
        return $this->hasMany(Service::class);
    }

    public function sales(): HasMany
    {
        return $this->hasMany(Sale::class);
    }

    public function hairdressers()
    {
        return $this->hasMany(Hairdresser::class);
    }

    public function promotions(): HasMany
    {
        return $this->hasMany(Promotion::class);
    }

    public function activePromotionForDate($date): ?Promotion
    {
        $date = $date instanceof Carbon ? $date : Carbon::parse($date);

        return $this->promotions
            ->filter(fn (Promotion $p) => $p->isActiveForDate($date))
            ->sortByDesc('percentage')
            ->first();
    }
}
