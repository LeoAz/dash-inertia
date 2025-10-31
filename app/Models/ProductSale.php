<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ProductSale extends Model
{
    /** @use HasFactory<\Database\Factories\ProductSaleFactory> */
    use HasFactory;

    protected $casts = [
        'unit_price' => 'decimal:2',
        'subtotal' => 'decimal:2',
    ];
}
