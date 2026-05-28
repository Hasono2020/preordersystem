<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('customers', function (Blueprint $table) {
            // 'default'       = follow their customer type for promo matching
            // 'reseller_promo' = always match reseller rules regardless of type
            $table->string('promo_type')->default('default')->after('type');
        });
    }

    public function down(): void
    {
        Schema::table('customers', function (Blueprint $table) {
            $table->dropColumn('promo_type');
        });
    }
};