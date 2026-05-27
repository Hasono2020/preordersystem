<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PromoRule extends Model
{
    protected $fillable = [
        'label',
        'customer_type',
        'min_items',
        'discount_flat',
        'discount_per_item',
        'free_shipping_max',
        'is_active',
    ];

    protected $casts = [
        'min_items'         => 'integer',
        'discount_flat'     => 'integer',
        'discount_per_item' => 'integer',
        'free_shipping_max' => 'integer',
        'is_active'         => 'boolean',
    ];
}