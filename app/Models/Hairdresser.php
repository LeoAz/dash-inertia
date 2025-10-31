<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Hairdresser extends Model
{
    /** @use HasFactory<\Database\Factories\HairdresserFactory> */
    use HasFactory;

    public function shop(): BelongsTo
    {
        return $this->belongsTo(Shop::class);
    }
}
