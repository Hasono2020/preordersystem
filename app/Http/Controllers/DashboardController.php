<?php

namespace App\Http\Controllers;

use App\Models\Customer;
use App\Models\Order;
use Inertia\Inertia;

class DashboardController extends Controller
{
    public function __invoke()
    {
        $stats = [
            'total_orders'     => Order::count(),
            'total_customers'  => Customer::count(),
            'this_month_sales' => Order::whereMonth('order_date', now()->month)
                                       ->whereYear('order_date', now()->year)
                                       ->sum('total_price'),
            'pending_remaining' => Order::where('remaining_payment', '>', 0)->sum('remaining_payment'),
            'recent_orders'    => Order::with(['customer'])
                                       ->latest()
                                       ->take(8)
                                       ->get(),
        ];

        return Inertia::render('dashboard', compact('stats'));
    }
}