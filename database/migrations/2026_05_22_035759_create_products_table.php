<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('products', function (Blueprint $table) {
            $table->id();
            $table->string('code')->unique();
            $table->string('name');
            $table->decimal('price', 10, 2)->default(0);
            $table->decimal('weight', 8, 2)->default(0);
            $table->json('colors')->nullable(); // ["RED","BLUE","WHITE"]
            $table->json('sizes')->nullable();  // ["S","M","L","XL"]
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('products');
    }
};