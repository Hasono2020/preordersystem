<?php
// ============================================================
// FIX 7b: app/Http/Controllers/ReportController.php
//
// Uses whereYear() / whereMonth() for filtering (DB-agnostic),
// and strftime() only in the SELECT for grouping labels —
// strftime is fine here because SQLite is used in production.
// DATE() in the daily query also works on SQLite.
// ============================================================

namespace App\Http\Controllers;

use App\Models\Order;
use Illuminate\Http\Request;
use Inertia\Inertia;

class ReportController extends Controller
{
    public function index(Request $request)
    {
        $period = $request->period ?? 'monthly';
        $year   = (int) ($request->year  ?? now()->year);
        $month  = (int) ($request->month ?? now()->month);

        if ($period === 'daily') {
            // DATE() works on SQLite
            $data = Order::whereYear('order_date', $year)
                ->whereMonth('order_date', $month)
                ->selectRaw("DATE(order_date) as label, COUNT(*) as total_orders, SUM(total_price - total_shipping_fee) as total_sales")
                ->groupBy('label')
                ->orderBy('label')
                ->get();
        } else {
            // whereYear() for filtering (DB-agnostic), strftime() for the month label (SQLite)
            $data = Order::whereYear('order_date', $year)
                ->selectRaw("strftime('%m', order_date) as month_num, COUNT(*) as total_orders, SUM(total_price - total_shipping_fee) as total_sales")
                ->groupBy('month_num')
                ->orderBy('month_num')
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