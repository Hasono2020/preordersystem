<?php

namespace App\Http\Controllers;

use App\Models\Trip;
use App\Models\OrderItem;
use Illuminate\Http\Request;
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
        $trip->load(['orders.customer', 'orders.items']);

        // Product summary for this trip (keep orders only)
        $keepItems = OrderItem::with(['order.customer'])
            ->whereHas('order', fn($q) => $q->where('trip_id', $trip->id)->where('status', 'keep'))
            ->get();

        $productSummary = $keepItems->groupBy(function ($item) {
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
                    'name'     => $i->order->customer->name ?? 'Unknown',
                    'order_id' => $i->order_id,
                    'quantity' => $i->quantity,
                ])->values(),
            ];
        })->values()->sortBy('product_name')->values();

        $stats = [
            'total_orders'   => $trip->orders->count(),
            'keep_orders'    => $trip->orders->where('status', 'keep')->count(),
            'bought_orders'  => $trip->orders->where('status', 'bought')->count(),
            'soldout_orders' => $trip->orders->where('status', 'sold_out')->count(),
            'total_value'    => $trip->orders->sum('total_price'),
            'total_remaining'=> $trip->orders->sum('remaining_payment'),
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