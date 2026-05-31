<?php

namespace App\Http\Controllers;

use App\Models\PurchaseOrder;
use App\Models\Trip;
use App\Models\OrderItem;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class PurchaseOrderController extends Controller
{
    public function index()
    {
        $purchases = PurchaseOrder::with(['trip', 'user'])
            ->withCount('items')
            ->latest()
            ->paginate(20);

        return Inertia::render('purchases/index', compact('purchases'));
    }

    public function create(Request $request)
    {
        $trips     = Trip::orderBy('name')->get(['id', 'name', 'location']);
        $tripId    = $request->trip_id;
        $suggested = [];

        if ($tripId) {
            $keepItems = OrderItem::with(['order.customer'])
                ->whereHas('order', fn($q) =>
                    $q->where('trip_id', $tripId)->where('status', 'keep')
                )
                ->get();

            $suggested = $keepItems->groupBy(function ($item) {
                return $item->product_name . '||' . ($item->color ?? '') . '||' . ($item->size ?? '');
            })->map(function ($group) {
                $first = $group->first();
                return [
                    'product_id'   => $first->product_id,
                    'product_name' => $first->product_name,
                    'color'        => $first->color ?? '',
                    'size'         => $first->size  ?? '',
                    'qty_ordered'  => $group->sum('quantity'),
                    'qty_received' => 0,
                    'cost_price'   => 0,
                    'total_cost'   => 0,
                ];
            })->values();
        }

        return Inertia::render('purchases/create', compact('trips', 'suggested', 'tripId'));
    }

    public function store(Request $request)
    {
        $request->validate([
            'trip_id'              => 'nullable|exists:trips,id',
            'supplier_name'        => 'nullable|string|max:255',
            'purchase_date'        => 'required|date',
            'status'               => 'required|in:draft,confirmed',
            'notes'                => 'nullable|string',
            'items'                => 'required|array|min:1',
            'items.*.product_name' => 'required|string|max:255',
            'items.*.color'        => 'nullable|string|max:100',
            'items.*.size'         => 'nullable|string|max:50',
            'items.*.qty_ordered'  => 'required|integer|min:0',
            'items.*.qty_received' => 'required|integer|min:0',
            'items.*.cost_price'   => 'required|numeric|min:0',
        ]);

        DB::transaction(function () use ($request) {
            $items     = $request->input('items');
            $totalCost = collect($items)->sum(fn($i) =>
                $i['qty_received'] * $i['cost_price']
            );

            $po = PurchaseOrder::create([
                'trip_id'       => $request->input('trip_id') ?: null,
                'user_id'       => Auth::id(),
                'supplier_name' => $request->input('supplier_name'),
                'purchase_date' => $request->input('purchase_date'),
                'status'        => $request->input('status'),
                'notes'         => $request->input('notes'),
                'total_cost'    => $totalCost,
            ]);

            foreach ($items as $item) {
                $po->items()->create([
                    'product_id'   => $item['product_id'] ?? null,
                    'product_name' => $item['product_name'],
                    'color'        => $item['color'] ?? null,
                    'size'         => $item['size']  ?? null,
                    'qty_ordered'  => $item['qty_ordered'],
                    'qty_received' => $item['qty_received'],
                    'cost_price'   => $item['cost_price'],
                    'total_cost'   => $item['qty_received'] * $item['cost_price'],
                ]);
            }
        });

        return redirect()->route('purchases.index')
            ->with('success', 'Purchase order saved.');
    }

    public function show(PurchaseOrder $purchase)
    {
        $purchase->load(['trip', 'user', 'items.product']);
        return Inertia::render('purchases/show', compact('purchase'));
    }

    public function edit(PurchaseOrder $purchase)
    {
        $purchase->load('items');
        $trips = Trip::orderBy('name')->get(['id', 'name', 'location']);
        return Inertia::render('purchases/edit', compact('purchase', 'trips'));
    }

    public function update(Request $request, PurchaseOrder $purchase)
    {
        $request->validate([
            'trip_id'              => 'nullable|exists:trips,id',
            'supplier_name'        => 'nullable|string|max:255',
            'purchase_date'        => 'required|date',
            'status'               => 'required|in:draft,confirmed',
            'notes'                => 'nullable|string',
            'items'                => 'required|array|min:1',
            'items.*.product_name' => 'required|string|max:255',
            'items.*.color'        => 'nullable|string|max:100',
            'items.*.size'         => 'nullable|string|max:50',
            'items.*.qty_ordered'  => 'required|integer|min:0',
            'items.*.qty_received' => 'required|integer|min:0',
            'items.*.cost_price'   => 'required|numeric|min:0',
        ]);

        DB::transaction(function () use ($request, $purchase) {
            $items     = $request->input('items');
            $totalCost = collect($items)->sum(fn($i) =>
                $i['qty_received'] * $i['cost_price']
            );

            $purchase->update([
                'trip_id'       => $request->input('trip_id') ?: null,
                'supplier_name' => $request->input('supplier_name'),
                'purchase_date' => $request->input('purchase_date'),
                'status'        => $request->input('status'),
                'notes'         => $request->input('notes'),
                'total_cost'    => $totalCost,
            ]);

            $purchase->items()->delete();
            foreach ($items as $item) {
                $purchase->items()->create([
                    'product_id'   => $item['product_id'] ?? null,
                    'product_name' => $item['product_name'],
                    'color'        => $item['color'] ?? null,
                    'size'         => $item['size']  ?? null,
                    'qty_ordered'  => $item['qty_ordered'],
                    'qty_received' => $item['qty_received'],
                    'cost_price'   => $item['cost_price'],
                    'total_cost'   => $item['qty_received'] * $item['cost_price'],
                ]);
            }
        });

        return redirect()->route('purchases.show', $purchase)
            ->with('success', 'Purchase order updated.');
    }

    public function destroy(PurchaseOrder $purchase)
    {
        // FIX 3: Block deletion of confirmed purchase orders.
        // Deleting a confirmed PO would orphan orders that were already
        // allocated and marked as bought/sold_out during allocation.
        if ($purchase->status === 'confirmed') {
            return redirect()->route('purchases.index')
                ->with('error',
                    "Cannot delete \"{$purchase->supplier_name}\" PO — " .
                    "it has already been confirmed and stock allocated. " .
                    "Edit it instead if corrections are needed."
                );
        }

        $purchase->delete();

        return redirect()->route('purchases.index')
            ->with('success', 'Purchase order deleted.');
    }
}