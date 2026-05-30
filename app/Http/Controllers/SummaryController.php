<?php

namespace App\Http\Controllers;

use App\Models\Order;
use App\Models\OrderItem;
use Illuminate\Http\Request;
use Inertia\Inertia;

class SummaryController extends Controller
{
    public function index(Request $request)
    {
        $status = $request->status ?? 'keep';

        // Get all order items from orders with the selected status
        // Group by product_name + color + size
        $items = OrderItem::with(['order.customer'])
            ->whereHas('order', fn($q) => $q->where('status', $status))
            ->get();

        // Group and aggregate
        $grouped = $items->groupBy(function ($item) {
            return $item->product_name . '||' . ($item->color ?? '') . '||' . ($item->size ?? '');
        })->map(function ($group) {
            $first = $group->first();
            return [
                'product_name' => $first->product_name,
                'color'        => $first->color ?? '—',
                'size'         => $first->size  ?? '—',
                'total_qty'    => $group->sum('quantity'),
                'total_value'  => $group->sum('total_price'),
                'customers'    => $group->map(fn($i) => [
                    'name'       => $i->order->customer->name ?? 'Unknown',
                    'order_id'   => $i->order_id,
                    'order_date' => $i->order->order_date,
                    'quantity'   => $i->quantity,
                    'price'      => $i->price,
                ])->values(),
            ];
        })->values()->sortBy('product_name')->values();

        $summary = [
            'total_items'    => $grouped->sum('total_qty'),
            'total_value'    => $grouped->sum('total_value'),
            'total_products' => $grouped->count(),
            'total_customers'=> $items->pluck('order.customer_id')->unique()->count(),
        ];

        return Inertia::render('summary/index', [
            'grouped' => $grouped,
            'summary' => $summary,
            'status'  => $status,
        ]);
    }
}