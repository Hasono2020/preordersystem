<?php

namespace App\Http\Controllers;

use App\Models\OrderItem;
use App\Models\PurchaseOrder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class AllocationController extends Controller
{
    public function show(PurchaseOrder $purchase)
    {
        $purchase->load(['trip', 'items']);

        // For each purchase item, find matching keep orders
        $allocationData = $purchase->items->map(function ($poItem) use ($purchase) {

            // Find all keep orders with matching product+color+size
            // in the same trip, sorted by order date (first come first served)
            $keepItems = OrderItem::with(['order.customer'])
                ->where('product_name', $poItem->product_name)
                ->where(fn($q) => $poItem->color
                    ? $q->where('color', $poItem->color)
                    : $q->whereNull('color')->orWhere('color', ''))
                ->where(fn($q) => $poItem->size
                    ? $q->where('size', $poItem->size)
                    : $q->whereNull('size')->orWhere('size', ''))
                ->whereHas('order', fn($q) => $q
                    ->where('status', 'keep')
                    ->when($purchase->trip_id, fn($q2) =>
                        $q2->where('trip_id', $purchase->trip_id)
                    )
                )
                ->orderBy(fn($q) => $q->select('order_date')
                    ->from('orders')
                    ->whereColumn('orders.id', 'order_items.order_id')
                    ->limit(1)
                )
                ->get();

            $totalOrdered  = $keepItems->sum('quantity');
            $qtyAvailable  = $poItem->qty_received;
            $qtyShortfall  = max(0, $totalOrdered - $qtyAvailable);

            // Simulate allocation — first come first served
            $remaining    = $qtyAvailable;
            $allocations  = $keepItems->map(function ($item) use (&$remaining) {
                $allocated  = min($item->quantity, $remaining);
                $remaining  = max(0, $remaining - $item->quantity);
                return [
                    'order_item_id'  => $item->id,
                    'order_id'       => $item->order_id,
                    'customer_name'  => $item->order->customer->name ?? 'Unknown',
                    'order_date'     => $item->order->order_date,
                    'qty_requested'  => $item->quantity,
                    'qty_allocated'  => $allocated,
                    'qty_shortfall'  => $item->quantity - $allocated,
                    'will_get'       => $allocated > 0,
                    'fully_filled'   => $allocated >= $item->quantity,
                ];
            });

            return [
                'po_item_id'    => $poItem->id,
                'product_name'  => $poItem->product_name,
                'color'         => $poItem->color ?? '—',
                'size'          => $poItem->size  ?? '—',
                'qty_needed'    => $totalOrdered,
                'qty_available' => $qtyAvailable,
                'qty_shortfall' => $qtyShortfall,
                'has_shortfall' => $qtyShortfall > 0,
                'allocations'   => $allocations,
            ];
        });

        return Inertia::render('purchases/allocate', [
            'purchase'       => $purchase,
            'allocationData' => $allocationData,
        ]);
    }

    public function allocate(Request $request, PurchaseOrder $purchase)
    {
        $purchase->load('items');

        DB::transaction(function () use ($purchase) {
            foreach ($purchase->items as $poItem) {

                // Find matching keep order items sorted by order date
                $keepItems = OrderItem::with('order')
                    ->where('product_name', $poItem->product_name)
                    ->where(fn($q) => $poItem->color
                        ? $q->where('color', $poItem->color)
                        : $q->whereNull('color')->orWhere('color', ''))
                    ->where(fn($q) => $poItem->size
                        ? $q->where('size', $poItem->size)
                        : $q->whereNull('size')->orWhere('size', ''))
                    ->whereHas('order', fn($q) => $q
                        ->where('status', 'keep')
                        ->when($purchase->trip_id, fn($q2) =>
                            $q2->where('trip_id', $purchase->trip_id)
                        )
                    )
                    ->join('orders', 'orders.id', '=', 'order_items.order_id')
                    ->orderBy('orders.order_date', 'asc')
                    ->orderBy('orders.id', 'asc')
                    ->select('order_items.*')
                    ->get();

                $remaining = $poItem->qty_received;

                foreach ($keepItems as $item) {
                    $order = $item->order;

                    if ($remaining <= 0) {
                        // No stock left — mark order as sold out
                        $order->update(['status' => 'sold_out']);
                    } elseif ($remaining >= $item->quantity) {
                        // Full allocation — mark as bought
                        $remaining -= $item->quantity;
                        $order->update(['status' => 'bought']);
                    } else {
                        // Partial — this customer gets some but not all
                        // For simplicity: if they can't get full qty, mark sold out
                        // (you can change this to allow partial if needed)
                        $order->update(['status' => 'sold_out']);
                    }
                }
            }

            // Mark purchase as confirmed
            $purchase->update(['status' => 'confirmed']);
        });

        return redirect()->route('purchases.show', $purchase)
            ->with('success', 'Stock allocated successfully! Orders updated to Bought or Sold Out.');
    }
}