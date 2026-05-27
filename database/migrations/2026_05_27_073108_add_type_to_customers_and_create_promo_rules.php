<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Add type to customers
        Schema::table('customers', function (Blueprint $table) {
            $table->string('type')->default('normal')->after('address'); // 'normal' or 'reseller'
        });

        // Promo rules table
        Schema::create('promo_rules', function (Blueprint $table) {
            $table->id();
            $table->string('label');                          // Human-readable name e.g. "3 items free shipping"
            $table->string('customer_type')->default('all'); // 'all', 'normal', 'reseller'
            $table->unsignedInteger('min_items');            // minimum total quantity to trigger
            $table->unsignedBigInteger('discount_flat')->default(0);      // flat order discount (e.g. 30000)
            $table->unsignedBigInteger('discount_per_item')->default(0);  // per-item discount (e.g. 20000)
            $table->unsignedBigInteger('free_shipping_max')->default(0);  // max free shipping (e.g. 30000)
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::table('customers', function (Blueprint $table) {
            $table->dropColumn('type');
        });
        Schema::dropIfExists('promo_rules');
    }
};