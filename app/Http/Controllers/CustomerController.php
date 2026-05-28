<?php

namespace App\Http\Controllers;

use App\Models\Customer;
use App\Models\ShippingArea;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class CustomerController extends Controller
{
    public function index()
    {
        $customers = Customer::with('area')->latest()->paginate(20);
        return Inertia::render('customers/index', compact('customers'));
    }

    public function create()
    {
        $areas = ShippingArea::orderBy('name')->get(['id', 'name', 'price_per_kg']);
        return Inertia::render('customers/create', compact('areas'));
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name'    => 'required|string|max:255',
            'phone'   => 'nullable|string|max:50',
            'address' => 'nullable|string',
            'area_id' => 'nullable|exists:shipping_areas,id',
            'type'       => 'required|in:normal,reseller',
            'promo_type' => 'nullable|in:default,reseller_promo',
        ]);

        $validated['promo_type'] = $validated['promo_type'] ?? 'default';
        Customer::create($validated);

        return redirect()->route('customers.index')
            ->with('success', 'Customer added successfully.');
    }

    public function edit(Customer $customer)
    {
        $areas = ShippingArea::orderBy('name')->get(['id', 'name', 'price_per_kg']);
        return Inertia::render('customers/edit', compact('customer', 'areas'));
    }

    public function update(Request $request, Customer $customer)
    {
        $validated = $request->validate([
            'name'    => 'required|string|max:255',
            'phone'   => 'nullable|string|max:50',
            'address' => 'nullable|string',
            'area_id' => 'nullable|exists:shipping_areas,id',
            'type'       => 'required|in:normal,reseller',
            'promo_type' => 'nullable|in:default,reseller_promo',
        ]);

        $validated['promo_type'] = $validated['promo_type'] ?? 'default';
        $customer->update($validated);

        return redirect()->route('customers.index')
            ->with('success', 'Customer updated successfully.');
    }

    public function destroy(Customer $customer)
    {
        // FIX 7: Block deletion if the customer has existing orders.
        // This prevents orphaned orders (SQLite) or a foreign key crash (MySQL).
        if ($customer->orders()->exists()) {
            return redirect()->route('customers.index')
                ->with('error', "Cannot delete \"{$customer->name}\" — they have existing orders. Delete the orders first.");
        }

        $customer->delete();

        return redirect()->route('customers.index')
            ->with('success', 'Customer deleted.');
    }

    public function print(Customer $customer)
    {
        $customer->load(['orders.items', 'area']);

        $summary = [
            'total_orders'    => $customer->orders->count(),
            'total_sales'     => $customer->orders->sum('total_price'),
            'total_remaining' => $customer->orders->sum('remaining_payment'),
            'total_paid'      => $customer->orders->sum('down_payment'),
        ];

        return Inertia::render('customers/print', compact('customer', 'summary'));
    }

    public function bulkDelete(Request $request)
    {
        /** @var \App\Models\User $user */
        $user = Auth::user();

        if ($request->boolean('all')) {
            if (!$user->isAdmin()) {
                abort(403, 'Only administrators can delete all customers.');
            }

            // Block if any customer has orders
            $withOrders = Customer::has('orders')->count();
            if ($withOrders > 0) {
                return redirect()->route('customers.index')
                    ->with('error', "Cannot delete all customers — {$withOrders} customer(s) still have orders. Delete their orders first.");
            }

            $count = Customer::count();
            Customer::query()->delete();

            return redirect()->route('customers.index')
                ->with('success', "{$count} customers deleted successfully.");
        }

        $request->validate([
            'ids'   => 'required|array|min:1',
            'ids.*' => 'exists:customers,id',
        ]);

        // Block customers who have orders
        $withOrders = Customer::whereIn('id', $request->ids)->has('orders')->pluck('name');
        if ($withOrders->isNotEmpty()) {
            $names = $withOrders->take(5)->join(', ');
            $extra = $withOrders->count() > 5 ? ' and ' . ($withOrders->count() - 5) . ' more' : '';
            return redirect()->route('customers.index')
                ->with('error', "Cannot delete: {$names}{$extra} still have orders. Delete their orders first.");
        }

        Customer::whereIn('id', $request->ids)->delete();
        $count = count($request->ids);

        return redirect()->route('customers.index')
            ->with('success', "{$count} customer(s) deleted successfully.");
    }
}