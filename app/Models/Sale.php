<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Sale extends Model
{
    /** @use HasFactory<\Database\Factories\SaleFactory> */
    use HasFactory;

    protected $casts = [
        'sale_date' => 'datetime',
        'total_amount' => 'decimal:2',
        'discount_amount' => 'decimal:2',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function receipt(): HasOne
    {
        return $this->hasOne(Receipt::class);
    }

    public function promotion(): BelongsTo
    {
        return $this->belongsTo(Promotion::class);
    }

    public function shop(): BelongsTo
    {
        return $this->belongsTo(Shop::class);
    }

    public function hairdresser(): BelongsTo
    {
        return $this->belongsTo(Hairdresser::class);
    }

    public function products(): BelongsToMany
    {
        return $this->belongsToMany(Product::class, 'product_sales')
            ->withPivot('quantity', 'unit_price', 'subtotal')
            ->withTimestamps();
    }

    public function services(): BelongsToMany
    {
        return $this->belongsToMany(Service::class, 'service_sales')
            ->withPivot('quantity', 'unit_price', 'subtotal')
            ->withTimestamps();
    }

    public function applyPromotion(?Promotion $promotion = null): void
    {
        $date = $this->sale_date ?: now();
        $explicitlySelected = false;

        if ($promotion) {
            $explicitlySelected = true;
        }

        if (! $promotion && $this->promotion_id) {
            $promotion = Promotion::find($this->promotion_id);
            if ($promotion) {
                $explicitlySelected = true;
            }
        }

        if (! $promotion && $this->shop) {
            $promotion = $this->shop->activePromotionForDate($date);
            $explicitlySelected = false;
        }

        if ($promotion) {
            // Always check temporal validity when days_of_week is defined on the promotion,
            // otherwise follow normal active rules for auto-selected promotions.
            $mustCheckActive = ! empty($promotion->days_of_week) || ! $explicitlySelected;
            if ($mustCheckActive && ! $promotion->isActiveForDate($date)) {
                // If the user explicitly selected this promotion, surface a validation error for the UI (Sonner)
                if ($explicitlySelected) {
                    throw \Illuminate\Validation\ValidationException::withMessages([
                        'promotion' => __('Cette promotion n’est pas active pour la date sélectionnée.'),
                    ]);
                }
                // Auto-applied promotions are silently cleared when not active
                $this->promotion_id = null;
                $this->discount_amount = null;

                return;
            }

            // Determine eligible base according to applicability flags
            $eligibleBase = 0.0;

            if ($promotion->appliesToProducts()) {
                // Use loaded relation if available to avoid extra query, else sum via query
                $eligibleBase += $this->relationLoaded('products')
                    ? (float) $this->products->sum(fn ($p) => (float) ($p->pivot->subtotal ?? 0))
                    : (float) $this->products()->sum('product_sales.subtotal');
            }

            if ($promotion->appliesToServices()) {
                $eligibleBase += $this->relationLoaded('services')
                    ? (float) $this->services->sum(fn ($s) => (float) ($s->pivot->subtotal ?? 0))
                    : (float) $this->services()->sum('service_sales.subtotal');
            }

            // If no eligible items in the sale, raise a validation error for the UI to consume
            if ($eligibleBase <= 0) {
                throw \Illuminate\Validation\ValidationException::withMessages([
                    'promotion' => __('Cette promotion ne peut pas être appliquée à cette vente.'),
                ]);
            }

            // Determine discount: prefer percentage when > 0, otherwise use fixed amount when > 0
            $base = max(0.0, (float) $eligibleBase);
            $pct = (float) ($promotion->percentage ?? 0);
            $amt = (float) ($promotion->amount ?? 0);
            $discount = 0.0;

            if ($pct > 0) {
                $discount = round(($pct / 100) * $base, 2);
            } elseif ($amt > 0) {
                // Cap fixed amount discount to the base total to avoid negative totals
                $discount = round(min($amt, $base), 2);
            }

            if ($discount > 0) {
                $this->promotion_id = $promotion->id;
                $this->discount_amount = $discount;

                return;
            }

            // If explicitly selected but no discount computed (e.g., 0%), still keep the promotion attached
            if ($explicitlySelected) {
                $this->promotion_id = $promotion->id;
                $this->discount_amount = 0.00;

                return;
            }
        }

        // No applicable promotion
        $this->promotion_id = null;
        $this->discount_amount = null;
    }
}
