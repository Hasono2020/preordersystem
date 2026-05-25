<?php

namespace App\Http\Controllers;

use App\Models\Order;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class ReportController extends Controller
{
    public function index(Request $request)
    {
        $period = $request->period ?? 'monthly';
        $year   = (int) ($request->year  ?? now()->year);
        $month  = (int) ($request->month ?? now()->month);

        if ($period === 'daily') {
            // DATE() works on both SQLite and MySQL.
            $data = Order::whereYear('order_date', $year)
                ->whereMonth('order_date', $month)
                ->selectRaw('DATE(order_date) as label, COUNT(*) as total_orders, SUM(total_price - total_shipping_fee) as total_sales')
                ->groupBy('label')
                ->orderBy('label')
                ->get();
        } else {
            // BUG 3 FIX: Detect the DB driver at runtime and use the correct
            // month-extraction function. strftime('%m',...) is SQLite-only;
            // MONTH() is the MySQL equivalent.
            $driver = DB::getDriverName();

            $monthExpr = $driver === 'sqlite'
                ? "CAST(strftime('%m', order_date) AS INTEGER)"
                : 'MONTH(order_date)';

            $data = Order::whereYear('order_date', $year)
                ->selectRaw("{$monthExpr} as month_num, COUNT(*) as total_orders, SUM(total_price - total_shipping_fee) as total_sales")
                ->groupByRaw($monthExpr)
                ->orderByRaw($monthExpr)
                ->get()
                ->map(fn($row) => [
                    ...$row->toArray(),
                    'label' => date('F', mktime(0, 0, 0, (int) $row->month_num, 1)),
                ]);
        }

        $summary = [
            'total_orders' => $data->sum('total_orders'),
            'total_sales'  => $data->sum('total_sales'),
        ];

        return Inertia::render('reports/index', compact('data', 'summary', 'period', 'year', 'month'));
    }
}