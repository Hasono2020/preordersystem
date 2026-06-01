<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // Only add the column if it doesn't already exist
        if (!Schema::hasColumn('order_items', 'status')) {
            Schema::table('order_items', function (Blueprint $table) {
                $table->enum('status', ['bought', 'keep', 'sold_out'])->default('keep')->after('total_price');
            });
        }

        // Migrate existing item statuses from their parent order
        DB::statement('UPDATE order_items SET status = (SELECT status FROM orders WHERE orders.id = order_items.order_id)');
    }

    public function down(): void
    {
        if (Schema::hasColumn('order_items', 'status')) {
            Schema::table('order_items', function (Blueprint $table) {
                $table->dropColumn('status');
            });
        }
    }
};