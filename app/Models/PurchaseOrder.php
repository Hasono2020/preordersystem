<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Models\Trip;
use App\Models\User;

class PurchaseOrder extends Model
{
    use HasFactory;

    protected $fillable = [
        'trip_id', 'user_id', 'supplier_name',
        'purchase_date', 'total_cost', 'status', 'notes',
    ];

    protected $casts = [
        'purchase_date' => 'date',
    ];

    public function trip()
    {
        return $this->belongsTo(Trip::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function items()
    {
        return $this->hasMany(PurchaseOrderItem::class);
    }
}