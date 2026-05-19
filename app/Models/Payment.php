<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Payment extends Model
{
    use HasFactory;

    protected $fillable = [
        'order_id', 'amount', 'type', 'paid_at', 'note',
    ];

    protected $casts = [
        'paid_at' => 'date',
    ];

    public function order()
    {
        return $this->belongsTo(Order::class);
    }
}