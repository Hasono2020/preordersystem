<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ShippingArea extends Model
{
    protected $fillable = ['name', 'price_per_kg'];

    public function customers()
    {
        return $this->hasMany(Customer::class, 'area_id');
    }
}