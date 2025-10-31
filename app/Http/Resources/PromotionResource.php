<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @property int $id
 * @property int|null $shop_id
 * @property string $name
 * @property string|float|int|null $percentage
 * @property string|float|int|null $amount
 * @property array<int,int>|null $days_of_week
 * @property bool $active
 * @property bool $applicable_to_products
 * @property bool $applicable_to_services
 * @property \Illuminate\Support\Carbon|null $starts_at
 * @property \Illuminate\Support\Carbon|null $ends_at
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 */
class PromotionResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'shop_id' => $this->shop_id,
            'name' => $this->name,
            'percentage' => (string) ($this->percentage ?? 0),
            'amount' => (string) ($this->amount ?? 0),
            'days_of_week' => $this->days_of_week,
            'active' => (bool) $this->active,
            'applicable_to_products' => (bool) $this->applicable_to_products,
            'applicable_to_services' => (bool) $this->applicable_to_services,
            'starts_at' => optional($this->starts_at)?->toDateString(),
            'ends_at' => optional($this->ends_at)?->toDateString(),
            'created_at' => optional($this->created_at)?->toISOString(),
            'updated_at' => optional($this->updated_at)?->toISOString(),
        ];
    }
}
