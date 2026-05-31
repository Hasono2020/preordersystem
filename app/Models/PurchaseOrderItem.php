<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PurchaseOrderItem extends Model
{
    use HasFactory;

    protected $fillable = [
        'purchase_order_id', 'product_id', 'product_name',
        'color', 'size', 'qty_ordered', 'qty_received',
        'cost_price', 'total_cost',
    ];

    public function purchaseOrder()
    {
        // FIX 5: Removed unused `use App\Models\PurchaseOrder` import.
        // Laravel resolves belongsTo by convention, no import needed.
        return $this->belongsTo(PurchaseOrder::class);
    }

    public function product()
    {
        return $this->belongsTo(Product::class);
    }
}