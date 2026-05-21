<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('shipping_areas', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->decimal('flat_price', 10, 2)->default(0);
            $table->decimal('price_per_kg', 10, 2)->default(0);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('shipping_areas');
    }
};