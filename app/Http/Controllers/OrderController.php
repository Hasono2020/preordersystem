<?php

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
    private function authorizeOrder(Order $order): void
    {
        /** @var \App\Models\User $user */
        $user = Auth::user();
        if (!$user->isAdmin() && $order->user_id !== $user->id) {
            abort(403, 'You are not allowed to modify this order.');
        }
    }

    public function index(Request $request)
    {
        $orders = Order::with(['customer', 'user', 'items'])
            ->when($request->status, fn($q) => $q->where('status', $request->status))
            ->when($request->search, function ($q) use ($request) {
                $raw    = ltrim(trim($request->search), '#');
                $search = '%' . $raw . '%';
                $q->where(function ($inner) use ($raw, $search) {
                    $inner->where('id', 'like', $search)
                          ->orWhereHas('customer', fn($q2) =>
                              $q2->where('name', 'like', $search)
                          )
                          ->orWhere('courier', 'like', $search)
                          ->orWhere('order_date', 'like', $search);
                });
            })
            ->when($request->date_from, fn($q) => $q->whereDate('order_date', '>=', $request->date_from))
            ->when($request->date_to,   fn($q) => $q->whereDate('order_date', '<=', $request->date_to))
            ->latest()
            ->paginate(20)
            ->withQueryString();

        return Inertia::render('orders/index', [
            'orders'  => $orders,
            'filters' => $request->only('status', 'search', 'date_from', 'date_to'),
        ]);
    }

    public function create()
    {
        $customers = Customer::with('area')->orderBy('name')
            ->get(['id', 'name', 'phone', 'area_id', 'type', 'promo_type']);
        $areas = ShippingArea::orderBy('name')
            ->get(['id', 'name', 'price_per_kg']);
        $trips = \App\Models\Trip::where('status', 'active')->orderBy('name')
            ->get(['id', 'name', 'location']);

        return Inertia::render('orders/create', compact('customers', 'areas', 'trips'));
    }

    public function store(Request $request)
    {
        if ($request->input('customer_mode') === 'new') {
            $request->validate([
                'new_customer_name'       => 'required|string|max:255',
                'new_customer_phone'      => 'nullable|string|max:50',
                'new_customer_address'    => 'nullable|string',
                'new_customer_area_id'    => 'nullable|exists:shipping_areas,id',
                'new_customer_type'       => 'nullable|in:normal,reseller',
                'new_customer_promo_type' => 'nullable|in:default,reseller_promo',
                'trip_id'                 => 'nullable|exists:trips,id',
            ]);
        } else {
            $request->validate(['customer_id' => 'required|exists:customers,id']);
        }

        $request->validate([
            'order_date'           => 'required|date',
            'status'               => 'required|in:bought,keep,sold_out',
            'discount'             => 'nullable|numeric|min:0',
            'discount_product'     => 'nullable|numeric|min:0',
            'discount_shipping'    => 'nullable|numeric|min:0',
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
            'trip_id'              => 'nullable|exists:trips,id',
        ]);

        $items         = $request->input('items');
        $itemsTotal    = collect($items)->sum(fn($i) => $i['quantity'] * $i['price']);
        $totalShipping = $request->input('weight', 0) * $request->input('shipping_fee_per_kg', 0);
        $totalPrice    = $itemsTotal - $request->input('discount', 0) + $totalShipping;

        $downPayment = min($request->input('down_payment', 0), $totalPrice);
        $remaining   = $totalPrice - $downPayment;

        $stockErrors = DB::transaction(function () use ($items) {
            $errors = [];
            foreach ($items as $index => $item) {
                if (!empty($item['product_id'])) {
                    $product = Product::lockForUpdate()->find($item['product_id']);
                    if (!$product) continue;

                    $color = $item['color'] ?? null;
                    $size  = $item['size']  ?? null;

                    // Bug #2 fix: check variant-level stock if color+size specified
                    if ($color && $size && is_array($product->variants)) {
                        $variant = collect($product->variants)->first(
                            fn($v) => strtoupper($v['color']) === strtoupper($color)
                                   && strtoupper($v['size'])  === strtoupper($size)
                        );
                        $variantQty = $variant ? (int)$variant['quantity'] : 0;
                        if ($variantQty < $item['quantity']) {
                            $errors["items.{$index}.quantity"] = [
                                "Only {$variantQty} units of \"{$product->name}\" ({$color} / {$size}) are in stock."
                            ];
                        }
                    } else {
                        // Fallback: check total stock
                        if ($product->quantity < $item['quantity']) {
                            $errors["items.{$index}.quantity"] = [
                                "Only {$product->quantity} units of \"{$product->name}\" are in stock."
                            ];
                        }
                    }
                }
            }
            return $errors;
        });

        if (!empty($stockErrors)) {
            return back()->withErrors($stockErrors)->withInput();
        }

        DB::transaction(function () use ($request, $items, $totalPrice, $totalShipping, $downPayment, $remaining) {
            if ($request->input('customer_mode') === 'new') {
                $customer = Customer::create([
                    'name'       => $request->input('new_customer_name'),
                    'phone'      => $request->input('new_customer_phone'),
                    'address'    => $request->input('new_customer_address'),
                    'area_id'    => $request->input('new_customer_area_id') ?: null,
                    'type'       => $request->input('new_customer_type', 'normal'),
                    'promo_type' => $request->input('new_customer_promo_type', 'default'),
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
                'discount_product'    => $request->input('discount_product', 0),
                'discount_shipping'   => $request->input('discount_shipping', 0),
                'shipping_fee'        => 0,
                'shipping_fee_per_kg' => $request->input('shipping_fee_per_kg', 0),
                'total_shipping_fee'  => $totalShipping,
                'weight'              => $request->input('weight', 0),
                'down_payment'        => $downPayment,
                'remaining_payment'   => $remaining,
                'courier'             => $request->input('courier'),
                'notes'               => $request->input('notes'),
                'total_price'         => $totalPrice,
                'trip_id'             => $request->input('trip_id'),
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

                if (!empty($item['product_id'])) {
                    $product = Product::lockForUpdate()->find($item['product_id']);
                    if ($product) {
                        $color    = $item['color'] ?? null;
                        $size     = $item['size']  ?? null;
                        $variants = is_array($product->variants) ? $product->variants : [];

                        if ($color && $size) {
                            $variants = array_map(function ($v) use ($color, $size, $item) {
                                if (strtoupper($v['color']) === strtoupper($color)
                                 && strtoupper($v['size'])  === strtoupper($size)) {
                                    $v['quantity'] = max(0, (int)$v['quantity'] - (int)$item['quantity']);
                                }
                                return $v;
                            }, $variants);
                        }

                        $newTotal = collect($variants)->sum('quantity');
                        $product->update(['variants' => $variants, 'quantity' => $newTotal]);
                    }
                }
            }
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
        $this->authorizeOrder($order);

        // FIX: eager-load items.product so exclude_from_promo is available
        // for existing items when the edit form loads and recalculates promo.
        // FIX: include promo_type in customers list (same as create).
        $order->load(['items.product', 'customer']);
        $customers = Customer::with('area')->orderBy('name')
            ->get(['id', 'name', 'phone', 'area_id', 'type', 'promo_type']);
        $areas = ShippingArea::orderBy('name')
            ->get(['id', 'name', 'price_per_kg']);
        $trips = \App\Models\Trip::where('status', 'active')->orderBy('name')
            ->get(['id', 'name', 'location']);

        return Inertia::render('orders/edit', compact('order', 'customers', 'areas', 'trips'));
    }

    public function update(Request $request, Order $order)
    {
        $this->authorizeOrder($order);

        $request->validate([
            'customer_id'          => 'required|exists:customers,id',
            'order_date'           => 'required|date',
            'status'               => 'required|in:bought,keep,sold_out',
            'discount'             => 'nullable|numeric|min:0',
            'discount_product'     => 'nullable|numeric|min:0',
            'discount_shipping'    => 'nullable|numeric|min:0',
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

        $downPayment = min($request->input('down_payment', 0), $totalPrice);
        $remaining   = $totalPrice - $downPayment;

        $stockErrors = DB::transaction(function () use ($order, $items) {
            $order->load('items');

            // Build returning map per product+color+size
            $returning = [];
            foreach ($order->items as $oldItem) {
                if ($oldItem->product_id) {
                    $key = $oldItem->product_id . '|' . strtoupper($oldItem->color ?? '') . '|' . strtoupper($oldItem->size ?? '');
                    $returning[$key] = ($returning[$key] ?? 0) + $oldItem->quantity;
                    // also track total per product for fallback
                    $returning['total_' . $oldItem->product_id] = ($returning['total_' . $oldItem->product_id] ?? 0) + $oldItem->quantity;
                }
            }

            $errors = [];
            foreach ($items as $index => $item) {
                if (!empty($item['product_id'])) {
                    $product = Product::lockForUpdate()->find($item['product_id']);
                    if (!$product) continue;

                    $color = $item['color'] ?? null;
                    $size  = $item['size']  ?? null;

                    if ($color && $size && is_array($product->variants)) {
                        $variant = collect($product->variants)->first(
                            fn($v) => strtoupper($v['color']) === strtoupper($color)
                                   && strtoupper($v['size'])  === strtoupper($size)
                        );
                        $variantQty  = $variant ? (int)$variant['quantity'] : 0;
                        $key         = $product->id . '|' . strtoupper($color) . '|' . strtoupper($size);
                        $available   = $variantQty + ($returning[$key] ?? 0);
                        if ($available < $item['quantity']) {
                            $errors["items.{$index}.quantity"] = [
                                "Only {$available} units of \"{$product->name}\" ({$color} / {$size}) will be available."
                            ];
                        }
                    } else {
                        $available = $product->quantity + ($returning['total_' . $product->id] ?? 0);
                        if ($available < $item['quantity']) {
                            $errors["items.{$index}.quantity"] = [
                                "Only {$available} units of \"{$product->name}\" will be available."
                            ];
                        }
                    }
                }
            }
            return $errors;
        });

        if (!empty($stockErrors)) {
            return back()->withErrors($stockErrors)->withInput();
        }

        DB::transaction(function () use ($request, $order, $items, $totalPrice, $totalShipping, $downPayment, $remaining) {
            $order->load('items');
            foreach ($order->items as $oldItem) {
                if ($oldItem->product_id) {
                    $prod = Product::lockForUpdate()->find($oldItem->product_id);
                    if ($prod) {
                        $oldColor = $oldItem->color ?? null;
                        $oldSize  = $oldItem->size  ?? null;
                        $vars     = is_array($prod->variants) ? $prod->variants : [];
                        if ($oldColor && $oldSize) {
                            $vars = array_map(function ($v) use ($oldColor, $oldSize, $oldItem) {
                                if (strtoupper($v['color']) === strtoupper($oldColor)
                                 && strtoupper($v['size'])  === strtoupper($oldSize)) {
                                    $v['quantity'] = (int)$v['quantity'] + (int)$oldItem->quantity;
                                }
                                return $v;
                            }, $vars);
                        }
                        $newTotal = collect($vars)->sum('quantity');
                        $prod->update(['variants' => $vars, 'quantity' => $newTotal]);
                    }
                }
            }

            $order->update([
                'customer_id'         => $request->input('customer_id'),
                'order_date'          => $request->input('order_date'),
                'status'              => $request->input('status'),
                'discount'            => $request->input('discount', 0),
                'discount_product'    => $request->input('discount_product', 0),
                'discount_shipping'   => $request->input('discount_shipping', 0),
                'shipping_fee'        => 0,
                'shipping_fee_per_kg' => $request->input('shipping_fee_per_kg', 0),
                'total_shipping_fee'  => $totalShipping,
                'weight'              => $request->input('weight', 0),
                'down_payment'        => $downPayment,
                'remaining_payment'   => $remaining,
                'courier'             => $request->input('courier'),
                'notes'               => $request->input('notes'),
                'total_price'         => $totalPrice,
                'trip_id'             => $request->input('trip_id') ?: null,
            ]);

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
                    if ($product) {
                        $color    = $item['color'] ?? null;
                        $size     = $item['size']  ?? null;
                        $variants = is_array($product->variants) ? $product->variants : [];

                        if ($color && $size) {
                            $variants = array_map(function ($v) use ($color, $size, $item) {
                                if (strtoupper($v['color']) === strtoupper($color)
                                 && strtoupper($v['size'])  === strtoupper($size)) {
                                    $v['quantity'] = max(0, (int)$v['quantity'] - (int)$item['quantity']);
                                }
                                return $v;
                            }, $variants);
                        }

                        $newTotal = collect($variants)->sum('quantity');
                        $product->update(['variants' => $variants, 'quantity' => $newTotal]);
                    }
                }
            }
        });

        return redirect()->route('orders.show', $order)
            ->with('success', 'Order updated.');
    }

    public function destroy(Order $order)
    {
        $this->authorizeOrder($order);

        DB::transaction(function () use ($order) {
            $order->load('items');
            foreach ($order->items as $item) {
                if ($item->product_id) {
                    $prod = Product::lockForUpdate()->find($item->product_id);
                    if ($prod) {
                        $dColor = $item->color ?? null;
                        $dSize  = $item->size  ?? null;
                        $vars   = is_array($prod->variants) ? $prod->variants : [];
                        if ($dColor && $dSize) {
                            $vars = array_map(function ($v) use ($dColor, $dSize, $item) {
                                if (strtoupper($v['color']) === strtoupper($dColor)
                                 && strtoupper($v['size'])  === strtoupper($dSize)) {
                                    $v['quantity'] = (int)$v['quantity'] + (int)$item->quantity;
                                }
                                return $v;
                            }, $vars);
                        }
                        $newTotal = collect($vars)->sum('quantity');
                        $prod->update(['variants' => $vars, 'quantity' => $newTotal]);
                    }
                }
            }
            $order->delete();
        });

        return redirect()->route('orders.index')
            ->with('success', 'Order deleted.');
    }
}