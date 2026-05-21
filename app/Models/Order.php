<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Order extends Model
{
    use HasFactory;

    protected $fillable = [
        'customer_id', 'user_id', 'order_date', 'status',
        'discount', 'shipping_fee', 'shipping_fee_per_kg',
        'total_shipping_fee', 'down_payment', 'remaining_payment',
        'courier', 'weight', 'total_price', 'notes',
    ];

    protected $casts = [
        'order_date' => 'date:Y-m-d',
    ];

    public function customer()
    {
        return $this->belongsTo(Customer::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function items()
    {
        return $this->hasMany(OrderItem::class);
    }

    public function payments()
    {
        return $this->hasMany(Payment::class);
    }
}