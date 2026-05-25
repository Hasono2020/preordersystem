<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Product>
 */
class ProductFactory extends Factory
{
    public function definition(): array
    {
        return [
            'code'     => strtoupper(fake()->unique()->bothify('??-####')),
            'name'     => fake()->words(3, true),
            'price'    => fake()->randomFloat(2, 10000, 500000),
            'weight'   => fake()->randomFloat(2, 0.1, 5.0),
            'quantity' => fake()->numberBetween(0, 100),
            'colors'   => ['RED', 'BLUE', 'WHITE'],
            'sizes'    => ['S', 'M', 'L', 'XL'],
        ];
    }
}