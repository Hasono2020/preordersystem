<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Product extends Model
{
    use HasFactory;

    protected $fillable = [
        'code', 'name', 'price', 'weight', 'quantity',
        'colors', 'sizes', 'exclude_from_promo',
    ];

    protected $casts = [
        'colors'            => 'array',
        'sizes'             => 'array',
        'price'             => 'float',
        'weight'            => 'float',
        'exclude_from_promo' => 'boolean',
    ];

    public function orderItems()
    {
        return $this->hasMany(OrderItem::class);
    }

    // Returns true if the product code ends with Z (MZ, NZ, PZ, etc.)
    public function hasZSuffix(): bool
    {
        return str_ends_with(strtoupper(trim($this->code)), 'Z');
    }
}