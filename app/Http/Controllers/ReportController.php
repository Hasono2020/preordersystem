<?php

namespace App\Http\Controllers;

use App\Models\Order;
use Illuminate\Http\Request;
use Inertia\Inertia;

class ReportController extends Controller
{
    public function index(Request $request)
    {
        $period = $request->period ?? 'monthly';
        $year   = $request->year  ?? now()->year;
        $month  = $request->month ?? now()->month;

        if ($period === 'daily') {
            $data = Order::selectRaw('DATE(order_date) as label, COUNT(*) as total_orders, SUM(total_price) as total_sales')
                ->whereYear('order_date', $year)
                ->whereMonth('order_date', $month)
                ->groupBy('label')
                ->orderBy('label')
                ->get();
        } else {
            $data = Order::selectRaw('MONTH(order_date) as month_num, YEAR(order_date) as year_num, COUNT(*) as total_orders, SUM(total_price) as total_sales')
                ->whereYear('order_date', $year)
                ->groupBy('year_num', 'month_num')
                ->orderBy('month_num')
                ->get()
                ->map(fn($row) => [
                    ...$row->toArray(),
                    'label' => date('F', mktime(0, 0, 0, $row->month_num, 1)),
                ]);
        }

        $summary = [
            'total_orders' => $data->sum('total_orders'),
            'total_sales'  => $data->sum('total_sales'),
        ];

        return Inertia::render('reports/index', compact('data', 'summary', 'period', 'year', 'month'));
    }
}