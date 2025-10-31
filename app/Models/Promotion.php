<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

class Promotion extends Model
{
    /** @use HasFactory<\Database\Factories\PromotionFactory> */
    use HasFactory;

    /**
     * @var list<string>
     */
    protected $fillable = [
        'shop_id',
        'name',
        'percentage',
        'amount',
        'days_of_week',
        'active',
        'applicable_to_products',
        'applicable_to_services',
        'starts_at',
        'ends_at',
    ];

    protected $casts = [
        'percentage' => 'decimal:2',
        'amount' => 'decimal:2',
        'days_of_week' => 'array',
        'active' => 'boolean',
        'starts_at' => 'date',
        'ends_at' => 'date',
        'applicable_to_products' => 'boolean',
        'applicable_to_services' => 'boolean',
    ];

    public function shop(): BelongsTo
    {
        return $this->belongsTo(Shop::class);
    }

    public function appliesToProducts(): bool
    {
        return (bool) ($this->applicable_to_products ?? true);
    }

    public function appliesToServices(): bool
    {
        return (bool) ($this->applicable_to_services ?? true);
    }

    public function isActiveForDate($date): bool
    {
        $date = $date instanceof Carbon ? $date : Carbon::parse($date);

        if (! $this->active) {
            return false;
        }

        if ($this->starts_at && $date->lt($this->starts_at)) {
            return false;
        }
        if ($this->ends_at && $date->gt($this->ends_at)) {
            return false;
        }

        // When days_of_week is defined (non-empty), enforce day restriction
        $days = collect($this->days_of_week ?? [])
            ->map(fn ($d) => (int) $d)
            ->filter(fn ($d) => $d >= 0 && $d <= 6)
            ->values()
            ->all();

        if (! empty($days)) {
            $dow = (int) $date->dayOfWeek; // 0 (Sun) - 6 (Sat)

            return in_array($dow, $days, true);
        }

        // No day restriction: active and within date window
        return true;
    }
}
