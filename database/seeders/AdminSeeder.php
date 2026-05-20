<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class AdminSeeder extends Seeder
{
    public function run(): void
    {
        // Only create if no admin exists yet
        if (!User::where('role', 'admin')->exists()) {
            User::create([
                'name'              => 'Admin',
                'email'             => 'admin@example.com',
                'password'          => Hash::make('admin123'),
                'role'              => 'admin',
                'email_verified_at' => now(),
            ]);

            $this->command->info('✅ Admin account created!');
            $this->command->info('   Email   : admin@example.com');
            $this->command->info('   Password: admin123');
            $this->command->warn('⚠️  Please change the password after first login!');
        } else {
            $this->command->info('ℹ️  Admin already exists, skipping.');
        }
    }
}