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

        $allocationData = $purchase->items->map(function ($poItem) use ($purchase) {

            // FIX 1: Replaced orderBy(closure) which is unsupported in Laravel
            // with a proper join + orderBy, matching what allocate() already does.
            $keepItems = OrderItem::with(['order.customer'])
                ->where('order_items.product_name', $poItem->product_name)
                ->where(fn($q) => $poItem->color
                    ? $q->where('order_items.color', $poItem->color)
                    : $q->whereNull('order_items.color')->orWhere('order_items.color', ''))
                ->where(fn($q) => $poItem->size
                    ? $q->where('order_items.size', $poItem->size)
                    : $q->whereNull('order_items.size')->orWhere('order_items.size', ''))
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

            $totalOrdered = $keepItems->sum('quantity');
            $qtyAvailable = $poItem->qty_received;
            $qtyShortfall = max(0, $totalOrdered - $qtyAvailable);

            $remaining   = $qtyAvailable;
            $allocations = $keepItems->map(function ($item) use (&$remaining) {
                $allocated = min($item->quantity, $remaining);
                $remaining = max(0, $remaining - $item->quantity);
                return [
                    'order_item_id' => $item->id,
                    'order_id'      => $item->order_id,
                    'customer_name' => $item->order->customer->name ?? 'Unknown',
                    'order_date'    => $item->order->order_date,
                    'qty_requested' => $item->quantity,
                    'qty_allocated' => $allocated,
                    'qty_shortfall' => $item->quantity - $allocated,
                    'will_get'      => $allocated > 0,
                    'fully_filled'  => $allocated >= $item->quantity,
                    // FIX 6: Expose partial allocation so the frontend can
                    // show customers who will get less than they requested.
                    'is_partial'    => $allocated > 0 && $allocated < $item->quantity,
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

                $keepItems = OrderItem::with('order')
                    ->where('order_items.product_name', $poItem->product_name)
                    ->where(fn($q) => $poItem->color
                        ? $q->where('order_items.color', $poItem->color)
                        : $q->whereNull('order_items.color')->orWhere('order_items.color', ''))
                    ->where(fn($q) => $poItem->size
                        ? $q->where('order_items.size', $poItem->size)
                        : $q->whereNull('order_items.size')->orWhere('order_items.size', ''))
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
                        // FIX 6: Partial allocation — record how many were
                        // actually received by updating the order item quantity,
                        // then mark the order as bought with a note instead of
                        // silently discarding the partial stock.
                        $item->update([
                            'quantity'    => $remaining,
                            'total_price' => $remaining * $item->price,
                        ]);

                        $existingNote = $order->notes ? $order->notes . "\n" : '';
                        $order->update([
                            'status' => 'bought',
                            'notes'  => $existingNote .
                                "Partial delivery: received {$remaining} of {$item->quantity} originally ordered.",
                        ]);

                        $remaining = 0;
                    }
                }
            }

            $purchase->update(['status' => 'confirmed']);
        });

        return redirect()->route('purchases.show', $purchase)
            ->with('success', 'Stock allocated successfully! Orders updated to Bought or Sold Out.');
    }
}