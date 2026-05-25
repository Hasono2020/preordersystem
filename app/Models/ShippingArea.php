<?php
// ============================================================
// FIX 1a: app/Models/ShippingArea.php
// Removed 'flat_price' from $fillable — column was dropped in
// migration 2026_05_21_075139 but was still listed here.
// ============================================================

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ShippingArea extends Model
{
    use HasFactory;

    // FIX 1a: 'flat_price' removed — it no longer exists in the database
    protected $fillable = ['name', 'price_per_kg'];

    public function customers()
    {
        return $this->hasMany(Customer::class, 'area_id');
    }
}