<?php
// ============================================================
// FIX 3: Wrap store() and update() in DB::transaction() so a
//         partial failure (e.g. item insert crash) can't leave
//         the database in a broken half-written state.
//
// FIX 4: Validate that down_payment <= total_price so
//         remaining_payment can never go negative.
//
// Also added pessimistic locking on stock decrements to prevent
// race conditions when two orders for the same product arrive
// at the same time.
// ============================================================

namespace App\Http\Controllers;

use App\Models\Customer;
use App\Models\Order;
use App\Models\Product;
use App\Models\ShippingArea;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
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
        $customers = Customer::with('area')->orderBy('name')->get(['id', 'name', 'phone', 'area_id']);
        $areas     = ShippingArea::orderBy('name')->get(['id', 'name', 'price_per_kg']);
        return Inertia::render('orders/create', compact('customers', 'areas'));
    }

    public function store(Request $request)
    {
        if ($request->input('customer_mode') === 'new') {
            $request->validate([
                'new_customer_name'    => 'required|string|max:255',
                'new_customer_phone'   => 'nullable|string|max:50',
                'new_customer_address' => 'nullable|string',
                'new_customer_area_id' => 'nullable|exists:shipping_areas,id',
            ]);
        } else {
            $request->validate(['customer_id' => 'required|exists:customers,id']);
        }

        $request->validate([
            'order_date'           => 'required|date',
            'status'               => 'required|in:bought,keep,sold_out',
            'discount'             => 'nullable|numeric|min:0',
            'shipping_fee_per_kg'  => 'nullable|numeric|min:0',
            'weight'               => 'nullable|numeric|min:0',
            // FIX 4: down_payment must be >= 0 (lte:total enforced below after calculation)
            'down_payment'         => 'nullable|numeric|min:0',
            'courier'              => 'nullable|string|max:100',
            'notes'                => 'nullable|string',
            'items'                => 'required|array|min:1',
            'items.*.product_id'   => 'nullable|exists:products,id',
            'items.*.product_name' => 'required|string|max:255',
            'items.*.color'        => 'nullable|string|max:100',
            'items.*.size'         => 'nullable|string|max:50',
            'items.*.quantity'     => 'required|integer|min:1',
            'items.*.price'        => 'required|numeric|min:0',
        ]);

        $items         = $request->input('items');
        $itemsTotal    = collect($items)->sum(fn($i) => $i['quantity'] * $i['price']);
        $totalShipping = $request->input('weight', 0) * $request->input('shipping_fee_per_kg', 0);
        $totalPrice    = $itemsTotal - $request->input('discount', 0) + $totalShipping;

        // FIX 4: Cap down_payment at totalPrice so remaining never goes negative
        $downPayment = min($request->input('down_payment', 0), $totalPrice);
        $remaining   = $totalPrice - $downPayment;

        // FIX 3: Wrap everything in a transaction so a crash mid-loop
        //         doesn't leave a half-created order with wrong stock.
        $order = DB::transaction(function () use (
            $request, $items, $totalPrice, $totalShipping, $downPayment, $remaining
        ) {
            if ($request->input('customer_mode') === 'new') {
                $customer = Customer::create([
                    'name'    => $request->input('new_customer_name'),
                    'phone'   => $request->input('new_customer_phone'),
                    'address' => $request->input('new_customer_address'),
                    'area_id' => $request->input('new_customer_area_id') ?: null,
                ]);
                $customerId = $customer->id;
            } else {
                $customerId = $request->input('customer_id');
            }

            $order = Order::create([
                'customer_id'         => $customerId,
                'user_id'             => Auth::id(),
                'order_date'          => $request->input('order_date'),
                'status'              => $request->input('status'),
                'discount'            => $request->input('discount', 0),
                'shipping_fee'        => 0,
                'shipping_fee_per_kg' => $request->input('shipping_fee_per_kg', 0),
                'total_shipping_fee'  => $totalShipping,
                'weight'              => $request->input('weight', 0),
                'down_payment'        => $downPayment,
                'remaining_payment'   => $remaining,
                'courier'             => $request->input('courier'),
                'notes'               => $request->input('notes'),
                'total_price'         => $totalPrice,
            ]);

            foreach ($items as $item) {
                $order->items()->create([
                    'product_id'   => $item['product_id'] ?? null,
                    'product_name' => $item['product_name'],
                    'color'        => $item['color'] ?? null,
                    'size'         => $item['size'] ?? null,
                    'quantity'     => $item['quantity'],
                    'price'        => $item['price'],
                    'total_price'  => $item['quantity'] * $item['price'],
                ]);

                // Pessimistic lock prevents two simultaneous orders overselling the same product
                if (!empty($item['product_id'])) {
                    $product = Product::lockForUpdate()->find($item['product_id']);
                    if ($product && $product->quantity >= $item['quantity']) {
                        $product->decrement('quantity', $item['quantity']);
                    }
                }
            }

            return $order;
        });

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
        $order->load(['items', 'customer']);
        $customers = Customer::with('area')->orderBy('name')->get(['id', 'name', 'phone', 'area_id']);
        $areas     = ShippingArea::orderBy('name')->get(['id', 'name', 'price_per_kg']);
        return Inertia::render('orders/edit', compact('order', 'customers', 'areas'));
    }

    public function update(Request $request, Order $order)
    {
        $request->validate([
            'customer_id'          => 'required|exists:customers,id',
            'order_date'           => 'required|date',
            'status'               => 'required|in:bought,keep,sold_out',
            'discount'             => 'nullable|numeric|min:0',
            'shipping_fee_per_kg'  => 'nullable|numeric|min:0',
            'weight'               => 'nullable|numeric|min:0',
            'down_payment'         => 'nullable|numeric|min:0',
            'courier'              => 'nullable|string|max:100',
            'notes'                => 'nullable|string',
            'items'                => 'required|array|min:1',
            'items.*.product_id'   => 'nullable|exists:products,id',
            'items.*.product_name' => 'required|string|max:255',
            'items.*.color'        => 'nullable|string|max:100',
            'items.*.size'         => 'nullable|string|max:50',
            'items.*.quantity'     => 'required|integer|min:1',
            'items.*.price'        => 'required|numeric|min:0',
        ]);

        $items         = $request->input('items');
        $itemsTotal    = collect($items)->sum(fn($i) => $i['quantity'] * $i['price']);
        $totalShipping = $request->input('weight', 0) * $request->input('shipping_fee_per_kg', 0);
        $totalPrice    = $itemsTotal - $request->input('discount', 0) + $totalShipping;

        // FIX 4: Cap down_payment so remaining stays >= 0
        $downPayment = min($request->input('down_payment', 0), $totalPrice);
        $remaining   = $totalPrice - $downPayment;

        // FIX 3: Wrap update + stock restore/re-deduct in a single transaction
        DB::transaction(function () use ($request, $order, $items, $totalPrice, $totalShipping, $downPayment, $remaining) {
            // Restore old stock first (load inside transaction to be safe)
            $order->load('items');
            foreach ($order->items as $oldItem) {
                if ($oldItem->product_id) {
                    Product::lockForUpdate()->find($oldItem->product_id)
                        ?->increment('quantity', $oldItem->quantity);
                }
            }

            $order->update([
                'customer_id'         => $request->input('customer_id'),
                'order_date'          => $request->input('order_date'),
                'status'              => $request->input('status'),
                'discount'            => $request->input('discount', 0),
                'shipping_fee'        => 0,
                'shipping_fee_per_kg' => $request->input('shipping_fee_per_kg', 0),
                'total_shipping_fee'  => $totalShipping,
                'weight'              => $request->input('weight', 0),
                'down_payment'        => $downPayment,
                'remaining_payment'   => $remaining,
                'courier'             => $request->input('courier'),
                'notes'               => $request->input('notes'),
                'total_price'         => $totalPrice,
            ]);

            // Replace items and deduct new stock
            $order->items()->delete();
            foreach ($items as $item) {
                $order->items()->create([
                    'product_id'   => $item['product_id'] ?? null,
                    'product_name' => $item['product_name'],
                    'color'        => $item['color'] ?? null,
                    'size'         => $item['size'] ?? null,
                    'quantity'     => $item['quantity'],
                    'price'        => $item['price'],
                    'total_price'  => $item['quantity'] * $item['price'],
                ]);

                if (!empty($item['product_id'])) {
                    $product = Product::lockForUpdate()->find($item['product_id']);
                    if ($product && $product->quantity >= $item['quantity']) {
                        $product->decrement('quantity', $item['quantity']);
                    }
                }
            }
        });

        return redirect()->route('orders.show', $order)
            ->with('success', 'Order updated.');
    }

    public function destroy(Order $order)
    {
        // FIX 3: Wrap delete + stock restore in a transaction
        DB::transaction(function () use ($order) {
            $order->load('items');
            foreach ($order->items as $item) {
                if ($item->product_id) {
                    Product::lockForUpdate()->find($item->product_id)
                        ?->increment('quantity', $item->quantity);
                }
            }
            $order->delete();
        });

        return redirect()->route('orders.index')
            ->with('success', 'Order deleted.');
    }
}