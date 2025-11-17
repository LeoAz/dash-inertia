<?php

namespace App\Http\Resources;

use App\Models\Sale;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Sale
 */
class SaleResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        // Build details from related products/services
        $productItems = $this->relationLoaded('products')
            ? $this->products->map(function ($p) {
                return [
                    'type' => 'product',
                    'name' => (string) ($p->name ?? ''),
                    'quantity' => (int) ($p->pivot->quantity ?? 1),
                    'unit_price' => (float) ($p->pivot->unit_price ?? $p->price ?? 0),
                    'line_subtotal' => (float) ($p->pivot->subtotal ?? (($p->pivot->unit_price ?? $p->price ?? 0) * max(1, (int) ($p->pivot->quantity ?? 1)))),
                ];
            })->all()
            : [];

        $serviceItems = $this->relationLoaded('services')
            ? $this->services->map(function ($srv) {
                return [
                    'type' => 'service',
                    'name' => (string) ($srv->name ?? ''),
                    'price' => (float) ($srv->pivot->unit_price ?? $srv->price ?? 0),
                ];
            })->all()
            : [];

        $promotion = $this->promotion;
        $promotionLabel = $promotion?->name;
        if (! $promotionLabel && $promotion) {
            $pct = (float) ($promotion->percentage ?? 0);
            $amt = (float) ($promotion->amount ?? 0);
            if ($pct > 0) {
                $promotionLabel = $pct.'%';
            } elseif ($amt > 0) {
                $promotionLabel = number_format($amt, 0, ',', ' ').' XOF';
            } else {
                $promotionLabel = __('Promotion');
            }
        }

        return [
            'id' => $this->id,
            'shop_id' => $this->shop_id,
            'receipt_number' => optional($this->receipt)->receipt_number,
            'customer_name' => $this->customer_name,
            'hairdresser_name' => optional($this->hairdresser)->name,
            'total_amount' => (float) $this->total_amount,
            'sale_date' => optional($this->sale_date)?->toISOString() ?? now()->toISOString(),
            'promotion_applied' => ! is_null($this->promotion_id),
            'promotion_label' => $promotionLabel,
            'details' => array_values(array_merge($productItems, $serviceItems)),
        ];
    }
}
