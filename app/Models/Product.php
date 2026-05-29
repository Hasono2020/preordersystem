<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Product extends Model
{
    use HasFactory;

    protected $fillable = [
        'code', 'name', 'price', 'weight', 'quantity',
        'colors', 'sizes', 'variants', 'exclude_from_promo',
    ];

    protected $casts = [
        'colors'             => 'array',
        'sizes'              => 'array',
        'variants'           => 'array',
        'price'              => 'float',
        'weight'             => 'float',
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

    // Get stock for a specific color+size
    public function variantStock(string $color, string $size): int
    {
        if (!$this->variants) return $this->quantity;
        foreach ($this->variants as $v) {
            if (strtoupper($v['color']) === strtoupper($color) &&
                strtoupper($v['size'])  === strtoupper($size)) {
                return (int) $v['quantity'];
            }
        }
        return 0;
    }

    // Recalculate total quantity from variants
    public function recalcTotalQuantity(): void
    {
        if ($this->variants) {
            $total = collect($this->variants)->sum('quantity');
            $this->update(['quantity' => $total]);
        }
    }
}