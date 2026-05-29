<?php

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

            // total_price already includes shipping fee, so this is gross sales this month
            'this_month_sales' => Order::whereYear('order_date', $now->year)
                ->whereMonth('order_date', $now->month)
                ->sum('total_price') ?? 0,

            'pending_remaining' => Order::where('remaining_payment', '>', 0)
                ->sum('remaining_payment'),

            // FIX 8: Added 'items' to eager load to prevent N+1 queries
            // if the dashboard view accesses item counts or details.
            'recent_orders' => Order::with(['customer', 'items'])
                ->latest()
                ->take(8)
                ->get(),
        ];

        return Inertia::render('dashboard', compact('stats'));
    }
}