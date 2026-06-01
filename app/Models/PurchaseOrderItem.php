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
        // PurchaseOrder::class requires the import below to resolve correctly
        // at runtime. Without it PHP throws "Class PurchaseOrder not found".
        return $this->belongsTo(PurchaseOrder::class);
    }

    public function product()
    {
        return $this->belongsTo(Product::class);
    }
}