<?php

namespace App\Http\Controllers;

use App\Models\OrderItem;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class SummaryController extends Controller
{
    public function index(Request $request)
    {
        $status = $request->status ?? 'keep';

        // FIX 2: Use database-level aggregation instead of loading all rows
        // into PHP memory. groupBy + sum in SQL is far more efficient at scale.
        $rows = OrderItem::query()
            ->join('orders', 'orders.id', '=', 'order_items.order_id')
            ->where('orders.status', $status)
            ->select([
                'order_items.product_name',
                DB::raw('COALESCE(NULLIF(order_items.color, ""), "—") as color'),
                DB::raw('COALESCE(NULLIF(order_items.size, ""),  "—") as size'),
                DB::raw('SUM(order_items.quantity)    as total_qty'),
                DB::raw('SUM(order_items.total_price) as total_value'),
            ])
            ->groupBy('order_items.product_name', 'order_items.color', 'order_items.size')
            ->orderBy('order_items.product_name')
            ->get();

        // Load customer details per product group as a second targeted query
        // rather than loading every item row.
        $customerRows = OrderItem::query()
            ->join('orders', 'orders.id', '=', 'order_items.order_id')
            ->join('customers', 'customers.id', '=', 'orders.customer_id')
            ->where('orders.status', $status)
            ->select([
                'order_items.product_name',
                'order_items.color',
                'order_items.size',
                'order_items.order_id',
                'order_items.quantity',
                'order_items.price',
                'orders.order_date',
                'customers.name as customer_name',
            ])
            ->orderBy('orders.order_date')
            ->get()
            ->groupBy(fn($r) =>
                $r->product_name . '||' . ($r->color ?? '') . '||' . ($r->size ?? '')
            );

        $grouped = $rows->map(function ($row) use ($customerRows) {
            $key       = $row->product_name . '||' .
                         ($row->color === '—' ? '' : $row->color) . '||' .
                         ($row->size  === '—' ? '' : $row->size);
            $customers = ($customerRows[$key] ?? collect())->map(fn($r) => [
                'name'       => $r->customer_name,
                'order_id'   => $r->order_id,
                'order_date' => $r->order_date,
                'quantity'   => $r->quantity,
                'price'      => $r->price,
            ])->values();

            return [
                'product_name' => $row->product_name,
                'color'        => $row->color,
                'size'         => $row->size,
                'total_qty'    => (int) $row->total_qty,
                'total_value'  => (float) $row->total_value,
                'customers'    => $customers,
            ];
        });

        $summary = [
            'total_items'     => $grouped->sum('total_qty'),
            'total_value'     => $grouped->sum('total_value'),
            'total_products'  => $grouped->count(),
            'total_customers' => OrderItem::query()
                ->join('orders', 'orders.id', '=', 'order_items.order_id')
                ->where('orders.status', $status)
                ->join('customers', 'customers.id', '=', 'orders.customer_id')
                ->distinct('customers.id')
                ->count('customers.id'),
        ];

        return Inertia::render('summary/index', [
            'grouped' => $grouped->values(),
            'summary' => $summary,
            'status'  => $status,
        ]);
    }
}