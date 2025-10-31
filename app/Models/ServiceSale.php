<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ServiceSale extends Model
{
    /** @use HasFactory<\Database\Factories\ServiceSaleFactory> */
    use HasFactory;

    public function service(): BelongsTo
    {
        return $this->belongsTo(Service::class);
    }

    public function sale(): BelongsTo
    {
        return $this->belongsTo(Sale::class);
    }
}
