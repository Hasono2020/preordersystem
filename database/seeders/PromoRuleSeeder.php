<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class PromoRuleSeeder extends Seeder
{
    public function run(): void
    {
        // Only seed if table is empty
        if (DB::table('promo_rules')->count() > 0) {
            return;
        }

        DB::table('promo_rules')->insert([
            [
                'label'            => 'Buy 3+ items — free shipping up to Rp30,000',
                'customer_type'    => 'all',
                'min_items'        => 3,
                'discount_flat'    => 0,
                'discount_per_item'=> 0,
                'free_shipping_max'=> 30000,
                'is_active'        => true,
                'created_at'       => now(),
                'updated_at'       => now(),
            ],
            [
                'label'            => 'Buy 5+ items — Rp30,000 discount + free shipping up to Rp30,000',
                'customer_type'    => 'all',
                'min_items'        => 5,
                'discount_flat'    => 30000,
                'discount_per_item'=> 0,
                'free_shipping_max'=> 30000,
                'is_active'        => true,
                'created_at'       => now(),
                'updated_at'       => now(),
            ],
            [
                'label'            => 'Buy 10+ items — Rp100,000 discount + free shipping up to Rp30,000',
                'customer_type'    => 'all',
                'min_items'        => 10,
                'discount_flat'    => 100000,
                'discount_per_item'=> 0,
                'free_shipping_max'=> 30000,
                'is_active'        => true,
                'created_at'       => now(),
                'updated_at'       => now(),
            ],
            [
                'label'            => 'Reseller buy 30+ items — Rp20,000 discount per item + free shipping up to Rp30,000',
                'customer_type'    => 'reseller',
                'min_items'        => 30,
                'discount_flat'    => 0,
                'discount_per_item'=> 20000,
                'free_shipping_max'=> 30000,
                'is_active'        => true,
                'created_at'       => now(),
                'updated_at'       => now(),
            ],
        ]);
    }
}