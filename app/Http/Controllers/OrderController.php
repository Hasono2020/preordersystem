<?php

namespace App\Http\Controllers;

use App\Models\Customer;
use App\Models\Order;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class OrderController extends Controller
{
    public function index(Request $request)
    {
        $orders = Order::with(['customer', 'user', 'items'])
            ->when($request->status, fn($q) => $q->where('status', $request->status))
            ->when($request->search, fn($q) => $q->whereHas('customer', fn($q2) =>
                $q2->where('name', 'like', '%' . $request->search . '%')
            ))
            ->latest()
            ->paginate(20)
            ->withQueryString();

        return Inertia::render('orders/index', [
            'orders'  => $orders,
            'filters' => $request->only('status', 'search'),
        ]);
    }

    public function create()
    {
        $customers = Customer::orderBy('name')->get(['id', 'name']);
        return Inertia::render('orders/create', compact('customers'));
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'customer_id'          => 'required|exists:customers,id',
            'order_date'           => 'required|date',
            'status'               => 'required|in:bought,keep,sold_out',
            'discount'             => 'nullable|numeric|min:0',
            'shipping_fee'         => 'nullable|numeric|min:0',
            'shipping_fee_per_kg'  => 'nullable|numeric|min:0',
            'total_shipping_fee'   => 'nullable|numeric|min:0',
            'down_payment'         => 'nullable|numeric|min:0',
            'courier'              => 'nullable|string|max:100',
            'notes'                => 'nullable|string',
            'items'                => 'required|array|min:1',
            'items.*.product_name' => 'required|string|max:255',
            'items.*.color'        => 'nullable|string|max:100',
            'items.*.size'         => 'nullable|string|max:50',
            'items.*.quantity'     => 'required|integer|min:1',
            'items.*.price'        => 'required|numeric|min:0',
        ]);

        $itemsTotal = collect($validated['items'])->sum(
            fn($i) => $i['quantity'] * $i['price']
        );

        $totalPrice = $itemsTotal
            - ($validated['discount'] ?? 0)
            + ($validated['total_shipping_fee'] ?? 0);

        $remaining = $totalPrice - ($validated['down_payment'] ?? 0);

        $order = Order::create([
            ...$validated,
            'user_id'           => Auth::id(),
            'total_price'       => $totalPrice,
            'remaining_payment' => $remaining,
        ]);

        foreach ($validated['items'] as $item) {
            $order->items()->create([
                ...$item,
                'total_price' => $item['quantity'] * $item['price'],
            ]);
        }

        return redirect()->route('orders.index')
            ->with('success', 'Order recorded successfully.');
    }

    public function show(Order $order)
    {
        $order->load(['customer', 'user', 'items', 'payments']);
        return Inertia::render('orders/show', compact('order'));
    }

    public function edit(Order $order)
    {
        $order->load('items');
        $customers = Customer::orderBy('name')->get(['id', 'name']);
        return Inertia::render('orders/edit', compact('order', 'customers'));
    }

    public function update(Request $request, Order $order)
    {
        $validated = $request->validate([
            'customer_id'          => 'required|exists:customers,id',
            'order_date'           => 'required|date',
            'status'               => 'required|in:bought,keep,sold_out',
            'discount'             => 'nullable|numeric|min:0',
            'shipping_fee'         => 'nullable|numeric|min:0',
            'shipping_fee_per_kg'  => 'nullable|numeric|min:0',
            'total_shipping_fee'   => 'nullable|numeric|min:0',
            'down_payment'         => 'nullable|numeric|min:0',
            'courier'              => 'nullable|string|max:100',
            'notes'                => 'nullable|string',
            'items'                => 'required|array|min:1',
            'items.*.product_name' => 'required|string|max:255',
            'items.*.color'        => 'nullable|string|max:100',
            'items.*.size'         => 'nullable|string|max:50',
            'items.*.quantity'     => 'required|integer|min:1',
            'items.*.price'        => 'required|numeric|min:0',
        ]);

        $itemsTotal = collect($validated['items'])->sum(
            fn($i) => $i['quantity'] * $i['price']
        );

        $totalPrice = $itemsTotal
            - ($validated['discount'] ?? 0)
            + ($validated['total_shipping_fee'] ?? 0);

        $remaining = $totalPrice - ($validated['down_payment'] ?? 0);

        $order->update([
            ...$validated,
            'total_price'       => $totalPrice,
            'remaining_payment' => $remaining,
        ]);

        $order->items()->delete();
        foreach ($validated['items'] as $item) {
            $order->items()->create([
                ...$item,
                'total_price' => $item['quantity'] * $item['price'],
            ]);
        }

        return redirect()->route('orders.show', $order)
            ->with('success', 'Order updated.');
    }

    public function destroy(Order $order)
    {
        $order->delete();
        return redirect()->route('orders.index')
            ->with('success', 'Order deleted.');
    }
}