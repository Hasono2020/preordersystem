<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Product extends Model
{
    use HasFactory;

    protected $fillable = [
        'code', 'name', 'price', 'weight', 'quantity', 'colors', 'sizes',
    ];

    protected $casts = [
        'colors' => 'array',
        'sizes'  => 'array',
        'price'  => 'float',
        'weight' => 'float',
    ];

    public function orderItems()
    {
        return $this->hasMany(OrderItem::class);
    }
}