<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('shipping_areas', function (Blueprint $table) {
            $table->dropColumn('flat_price');
        });
    }

    public function down(): void
    {
        Schema::table('shipping_areas', function (Blueprint $table) {
            $table->decimal('flat_price', 10, 2)->default(0);
        });
    }
};