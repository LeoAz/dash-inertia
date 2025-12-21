<?php

namespace App\Http\Requests;

use App\Models\Shop;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateSaleRequest extends FormRequest
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
            'customer_name' => ['sometimes', 'required', 'string', 'max:255'],
            'customer_phone' => ['sometimes', 'required', 'string', 'max:30'],
            'sale_date' => ['sometimes', 'required', 'date'],
            'hairdresser_id' => ['nullable', 'integer', Rule::exists('hairdressers', 'id')->where('shop_id', $shopId)],

            // Moyen de paiement modifiable (requis si présent dans la requête)
            'payment_method' => ['sometimes', 'required', Rule::in(['orange_money', 'caisse'])],

            'products' => ['sometimes', 'array'],
            'products.*.product_id' => ['required_with:products', 'integer', Rule::exists('products', 'id')->where('shop_id', $shopId)],
            'products.*.quantity' => ['required_with:products', 'integer', 'min:1'],

            'services' => ['sometimes', 'array'],
            'services.*.service_id' => ['required_with:services', 'integer', Rule::exists('services', 'id')->where('shop_id', $shopId)],
            'services.*.quantity' => ['required_with:services', 'integer', 'min:1'],

            'promotion_id' => ['nullable', 'integer', Rule::exists('promotions', 'id')->where('shop_id', $shopId)],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'payment_method.required' => __('Le moyen de paiement est obligatoire.'),
            'payment_method.in' => __('Le moyen de paiement sélectionné est invalide.'),
            'products.*.product_id.required_with' => __('Veuillez sélectionner un produit.'),
            'products.*.quantity.min' => __('La quantité doit être au moins 1.'),
            'services.*.service_id.required_with' => __('Veuillez sélectionner un service.'),
        ];
    }
}
