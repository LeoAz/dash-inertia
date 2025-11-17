<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreUserRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null; // Access restricted by routes / middleware
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        $roleValues = ['Super admin', 'admin', 'vendeur'];

        return [
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'email', 'max:255', 'unique:users,email'],
            'password' => ['required', 'string', 'min:6', 'confirmed'],
            'role' => ['required', 'string', Rule::in($roleValues)],

            // Shop assignment fields (conditional by role)
            // For admin: array of shop ids
            'shop_ids' => ['nullable', 'array'],
            'shop_ids.*' => ['integer', 'exists:shops,id'],
            // For vendeur: single shop id
            'shop_id' => ['nullable', 'integer', 'exists:shops,id'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'password.min' => 'Le mot de passe doit contenir au moins 6 caractères.',
            'password.confirmed' => 'La confirmation du mot de passe ne correspond pas.',
            'email.unique' => 'Cet email est déjà utilisé.',
        ];
    }
}
