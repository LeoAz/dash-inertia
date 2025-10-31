<?php

namespace App\Models\Concerns;

use Illuminate\Support\Carbon;

/**
 * Shared logic for models that are activatable by date windows.
 */
trait HasDateActivatable
{
    /**
     * Determine if the model is active for a given date.
     *
     * Expects the host model to have boolean "active" and nullable date
     * attributes "starts_at" and "ends_at" (Carbon|date-string|null).
     * Optionally supports an array attribute "days_of_week" (0=Sun..6=Sat)
     * to restrict applicability to specific weekdays.
     */
    public function isActiveForDate($date): bool
    {
        $date = $date instanceof Carbon ? $date : Carbon::parse($date);

        if (! $this->active) {
            return false;
        }

        $startsAt = $this->starts_at ? ($this->starts_at instanceof Carbon ? $this->starts_at : Carbon::parse($this->starts_at)) : null;
        $endsAt = $this->ends_at ? ($this->ends_at instanceof Carbon ? $this->ends_at : Carbon::parse($this->ends_at)) : null;

        if ($startsAt && $date->lt($startsAt)) {
            return false;
        }

        if ($endsAt && $date->gt($endsAt)) {
            return false;
        }

        // If days_of_week is defined and non-empty on the host model, enforce weekday restriction
        $days = collect($this->days_of_week ?? [])
            ->map(fn ($d) => (int) $d)
            ->filter(fn ($d) => $d >= 0 && $d <= 6)
            ->values()
            ->all();

        if (! empty($days)) {
            $dow = (int) $date->dayOfWeek; // 0 (Sun) - 6 (Sat)

            return in_array($dow, $days, true);
        }

        return true;
    }
}
