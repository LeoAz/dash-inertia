<?php

namespace App\Http\Requests;

use App\Models\Shop;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreSaleRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        $shopParam = $this->route('shop');
        $shopId = $shopParam instanceof Shop ? (int) $shopParam->id : (int) $shopParam;

        return [
            'customer_name' => ['required', 'string', 'max:255'],
            'customer_phone' => ['required', 'string', 'max:30'],
            'sale_date' => ['required', 'date'],
            'hairdresser_id' => ['nullable', 'integer', Rule::exists('hairdressers', 'id')->where('shop_id', $shopId)],

            'products' => ['array'],
            'products.*.product_id' => ['required_with:products', 'integer', Rule::exists('products', 'id')->where('shop_id', $shopId)],
            'products.*.quantity' => ['required_with:products', 'integer', 'min:1'],

            'services' => ['array'],
            'services.*.service_id' => ['required_with:services', 'integer', Rule::exists('services', 'id')->where('shop_id', $shopId)],

            'promotion_id' => ['nullable', 'integer', Rule::exists('promotions', 'id')->where('shop_id', $shopId)],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'products.*.product_id.required_with' => __('Veuillez sélectionner un produit.'),
            'products.*.quantity.min' => __('La quantité doit être au moins 1.'),
            'services.*.service_id.required_with' => __('Veuillez sélectionner un service.'),
        ];
    }
}
