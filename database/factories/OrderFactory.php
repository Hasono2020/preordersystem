<?php

namespace Database\Factories;

use App\Models\Customer;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Order>
 */
class OrderFactory extends Factory
{
    // FIX 7: OrderFactory enables tests and seeders to create orders directly
    // without going through HTTP, making tests faster and more focused.

    public function definition(): array
    {
        $itemsTotal  = fake()->randomFloat(2, 50000, 2000000);
        $downPayment = fake()->boolean(60)
            ? fake()->randomFloat(2, 0, $itemsTotal)
            : 0;

        return [
            'customer_id'         => Customer::factory(),
            'user_id'             => User::factory(),
            'order_date'          => fake()->dateTimeBetween('-6 months', 'now')->format('Y-m-d'),
            'status'              => fake()->randomElement(['bought', 'keep', 'sold_out']),
            'discount'            => 0,
            'shipping_fee'        => 0,
            'shipping_fee_per_kg' => 0,
            'total_shipping_fee'  => 0,
            'weight'              => 0,
            'down_payment'        => $downPayment,
            'remaining_payment'   => $itemsTotal - $downPayment,
            'courier'             => fake()->optional()->randomElement(['JNE', 'J&T', 'SiCepat', 'AnterAja']),
            'total_price'         => $itemsTotal,
            'notes'               => fake()->optional()->sentence(),
        ];
    }

    public function bought(): static
    {
        return $this->state(fn(array $a) => ['status' => 'bought']);
    }

    public function keep(): static
    {
        return $this->state(fn(array $a) => ['status' => 'keep']);
    }

    public function soldOut(): static
    {
        return $this->state(fn(array $a) => ['status' => 'sold_out']);
    }

    public function paid(): static
    {
        return $this->state(fn(array $a) => [
            'down_payment'      => $a['total_price'],
            'remaining_payment' => 0,
        ]);
    }

    public function unpaid(): static
    {
        return $this->state(fn(array $a) => [
            'down_payment'      => 0,
            'remaining_payment' => $a['total_price'],
        ]);
    }
}