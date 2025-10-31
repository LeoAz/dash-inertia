<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class UpdatePromotionRequest extends FormRequest
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
        return [
            'name' => ['required', 'string', 'max:255'],
            'percentage' => ['nullable', 'numeric', 'min:0', 'max:100'],
            'amount' => ['nullable', 'numeric', 'min:0'],
            'days_of_week' => ['nullable', 'array'],
            'days_of_week.*' => ['integer', 'between:0,6'],
            'active' => ['boolean'],
            'applicable_to_products' => ['boolean'],
            'applicable_to_services' => ['boolean'],
            'starts_at' => ['nullable', 'date'],
            'ends_at' => ['nullable', 'date', 'after_or_equal:starts_at'],
        ];
    }

    protected function prepareForValidation(): void
    {
        // Normalize booleans and numeric fields before validation
        $percentage = $this->input('percentage');
        $amount = $this->input('amount');

        $this->merge([
            'percentage' => ($percentage === '' || $percentage === null) ? 0 : $percentage,
            'amount' => ($amount === '' || $amount === null) ? 0 : $amount,
            'active' => filter_var($this->input('active', false), FILTER_VALIDATE_BOOL),
            'applicable_to_products' => filter_var($this->input('applicable_to_products', false), FILTER_VALIDATE_BOOL),
            'applicable_to_services' => filter_var($this->input('applicable_to_services', false), FILTER_VALIDATE_BOOL),
        ]);
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $v) {
            $pct = (float) ($this->input('percentage') ?? 0);
            $amt = (float) ($this->input('amount') ?? 0);

            if ($pct <= 0 && $amt <= 0) {
                $v->errors()->add('percentage', __('Veuillez définir un pourcentage ou un montant fixe.'));
                $v->errors()->add('amount', __('Veuillez définir un pourcentage ou un montant fixe.'));
            }

            if ($pct > 0 && $amt > 0) {
                $v->errors()->add('percentage', __('Ne définissez pas à la fois un pourcentage et un montant fixe.'));
                $v->errors()->add('amount', __('Ne définissez pas à la fois un pourcentage et un montant fixe.'));
            }

            $apProducts = (bool) $this->boolean('applicable_to_products');
            $apServices = (bool) $this->boolean('applicable_to_services');
            if (! $apProducts && ! $apServices) {
                $v->errors()->add('applicable_to_products', __('Sélectionnez au moins un type d\'application (produits ou services).'));
            }
        });
    }
}
