<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Customer extends Model
{
    use HasFactory;

    protected $fillable = ['name', 'phone', 'address', 'area_id', 'type'];

    public function orders()
    {
        return $this->hasMany(Order::class);
    }

    public function area()
    {
        return $this->belongsTo(ShippingArea::class, 'area_id');
    }
}