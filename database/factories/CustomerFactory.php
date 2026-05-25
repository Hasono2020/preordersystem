<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Customer>
 */
class CustomerFactory extends Factory
{
    public function definition(): array
    {
        return [
            'name'    => fake()->name(),
            'phone'   => fake()->phoneNumber(),
            'address' => fake()->address(),
            'area_id' => null,
        ];
    }
}