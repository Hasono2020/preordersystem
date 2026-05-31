<?php

namespace App\Http\Controllers;

use App\Models\Trip;
use App\Models\OrderItem;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class TripController extends Controller
{
    public function index()
    {
        $trips = Trip::withCount('orders')
            ->withSum('orders', 'total_price')
            ->latest()
            ->get();

        return Inertia::render('trips/index', compact('trips'));
    }

    public function create()
    {
        return Inertia::render('trips/create');
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name'       => 'required|string|max:255',
            'location'   => 'nullable|string|max:255',
            'start_date' => 'nullable|date',
            'end_date'   => 'nullable|date|after_or_equal:start_date',
            'notes'      => 'nullable|string',
        ]);

        Trip::create($validated);

        return redirect()->route('trips.index')
            ->with('success', 'Trip created successfully.');
    }

    public function show(Trip $trip)
    {
        $trip->loadCount('orders')
             ->loadSum('orders', 'total_price');

        // FIX 2: Use database-level aggregation instead of loading all order
        // items into PHP memory and grouping in PHP.
        $productRows = OrderItem::query()
            ->join('orders', 'orders.id', '=', 'order_items.order_id')
            ->where('orders.trip_id', $trip->id)
            ->where('orders.status', 'keep')
            ->select([
                'order_items.product_name',
                DB::raw('COALESCE(NULLIF(order_items.color, ""), "—") as color'),
                DB::raw('COALESCE(NULLIF(order_items.size,  ""), "—") as size'),
                DB::raw('SUM(order_items.quantity)    as total_qty'),
                DB::raw('SUM(order_items.total_price) as total_value'),
            ])
            ->groupBy('order_items.product_name', 'order_items.color', 'order_items.size')
            ->orderBy('order_items.product_name')
            ->get();

        $customerRows = OrderItem::query()
            ->join('orders', 'orders.id', '=', 'order_items.order_id')
            ->join('customers', 'customers.id', '=', 'orders.customer_id')
            ->where('orders.trip_id', $trip->id)
            ->where('orders.status', 'keep')
            ->select([
                'order_items.product_name',
                'order_items.color',
                'order_items.size',
                'order_items.order_id',
                'order_items.quantity',
                'customers.name as customer_name',
            ])
            ->orderBy('orders.order_date')
            ->get()
            ->groupBy(fn($r) =>
                $r->product_name . '||' . ($r->color ?? '') . '||' . ($r->size ?? '')
            );

        $productSummary = $productRows->map(function ($row) use ($customerRows) {
            $key       = $row->product_name . '||' .
                         ($row->color === '—' ? '' : $row->color) . '||' .
                         ($row->size  === '—' ? '' : $row->size);
            $customers = ($customerRows[$key] ?? collect())->map(fn($r) => [
                'name'     => $r->customer_name,
                'order_id' => $r->order_id,
                'quantity' => $r->quantity,
            ])->values();

            return [
                'product_name' => $row->product_name,
                'color'        => $row->color,
                'size'         => $row->size,
                'total_qty'    => (int) $row->total_qty,
                'total_value'  => (float) $row->total_value,
                'customers'    => $customers,
            ];
        })->values();

        $stats = [
            'total_orders'    => $trip->orders_count,
            'keep_orders'     => $trip->orders()->where('status', 'keep')->count(),
            'bought_orders'   => $trip->orders()->where('status', 'bought')->count(),
            'soldout_orders'  => $trip->orders()->where('status', 'sold_out')->count(),
            'total_value'     => $trip->orders_sum_total_price ?? 0,
            'total_remaining' => $trip->orders()->sum('remaining_payment'),
        ];

        return Inertia::render('trips/show', compact('trip', 'productSummary', 'stats'));
    }

    public function edit(Trip $trip)
    {
        return Inertia::render('trips/edit', compact('trip'));
    }

    public function update(Request $request, Trip $trip)
    {
        $validated = $request->validate([
            'name'       => 'required|string|max:255',
            'location'   => 'nullable|string|max:255',
            'start_date' => 'nullable|date',
            'end_date'   => 'nullable|date|after_or_equal:start_date',
            'status'     => 'required|in:active,closed',
            'notes'      => 'nullable|string',
        ]);

        $trip->update($validated);

        return redirect()->route('trips.show', $trip)
            ->with('success', 'Trip updated.');
    }

    public function destroy(Trip $trip)
    {
        $trip->delete();
        return redirect()->route('trips.index')
            ->with('success', 'Trip deleted.');
    }

    public function close(Trip $trip)
    {
        $trip->update(['status' => 'closed']);
        return redirect()->route('trips.show', $trip)
            ->with('success', 'Trip closed.');
    }
}