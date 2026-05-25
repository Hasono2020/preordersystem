<?php
// ============================================================
// FIX 9: database/seeders/AdminSeeder.php
//
// Generates a cryptographically random password instead of
// the hardcoded 'admin123'. The password is printed to the
// console once — copy it on first run, then change it via
// the profile settings.
// ============================================================

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class AdminSeeder extends Seeder
{
    public function run(): void
    {
        if (!User::where('role', 'admin')->exists()) {
            // FIX 9: Random 16-character password — no more hardcoded 'admin123'
            $password = Str::password(16);

            User::create([
                'name'              => 'Admin',
                'email'             => 'admin@example.com',
                'password'          => Hash::make($password),
                'role'              => 'admin',
                'email_verified_at' => now(),
            ]);

            $this->command->info('✅ Admin account created!');
            $this->command->info('   Email   : admin@example.com');
            $this->command->info('   Password: ' . $password);
            $this->command->warn('⚠️  Save this password now — it will not be shown again!');
        } else {
            $this->command->info('ℹ️  Admin already exists, skipping.');
        }
    }
}