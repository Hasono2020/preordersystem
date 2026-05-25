<?php
// ============================================================
// FIX 7a: app/Http/Controllers/DashboardController.php
//
// Replaced SQLite-specific strftime('%Y-%m', order_date)
// with Laravel's whereYear() + whereMonth() helpers,
// which work on both SQLite (dev) and MySQL (production).
// ============================================================

namespace App\Http\Controllers;

use App\Models\Customer;
use App\Models\Order;
use Inertia\Inertia;

class DashboardController extends Controller
{
    public function __invoke()
    {
        $now = now();

        $stats = [
            'total_orders'    => Order::count(),
            'total_customers' => Customer::count(),

            // FIX 7a: Use whereYear/whereMonth instead of strftime (SQLite-only)
            'this_month_sales' => Order::whereYear('order_date', $now->year)
                                    ->whereMonth('order_date', $now->month)
                                    ->selectRaw('SUM(total_price - total_shipping_fee) as total')
                                    ->value('total') ?? 0,

            'pending_remaining' => Order::where('remaining_payment', '>', 0)->sum('remaining_payment'),

            'recent_orders' => Order::with(['customer'])
                                   ->latest()
                                   ->take(8)
                                   ->get(),
        ];

        return Inertia::render('dashboard', compact('stats'));
    }
}