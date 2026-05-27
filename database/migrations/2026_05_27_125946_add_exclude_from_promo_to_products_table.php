<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use App\Models\Product;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->boolean('exclude_from_promo')->default(false)->after('quantity');
        });

        // Auto-mark existing products whose code ends in Z (MZ, NZ, PZ, etc.)
        Product::all()->each(function ($product) {
            if (str_ends_with(strtoupper(trim($product->code)), 'Z')) {
                $product->update(['exclude_from_promo' => true]);
            }
        });
    }

    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->dropColumn('exclude_from_promo');
        });
    }
};