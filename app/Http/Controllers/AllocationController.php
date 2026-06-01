<?php

namespace App\Http\Controllers;

use App\Models\OrderItem;
use App\Models\Product;
use App\Models\PurchaseOrder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class AllocationController extends Controller
{
    // ─── Variant stock helpers ────────────────────────────────

    /**
     * Increment a specific color+size variant's stock in the Product catalog.
     * If the product has no variants, increments the flat quantity instead.
     * Used when PO stock arrives and is confirmed.
     */
    private function incrementProductStock(Product $product, ?string $color, ?string $size, int $qty): void
    {
        $variants = $product->variants ?? [];

        if (!empty($variants) && $color && $size) {
            $found = false;
            foreach ($variants as &$v) {
                if (strtoupper($v['color']) === strtoupper($color) &&
                    strtoupper($v['size'])  === strtoupper($size)) {
                    $v['quantity'] = (int)$v['quantity'] + $qty;
                    $found = true;
                    break;
                }
            }
            unset($v);

            // If variant doesn't exist yet (new color/size from supplier),
            // add it as a new variant entry.
            if (!$found) {
                $variants[] = [
                    'color'    => strtoupper($color),
                    'size'     => strtoupper($size),
                    'quantity' => $qty,
                ];
            }

            $total = collect($variants)->sum('quantity');
            $product->update(['variants' => $variants, 'quantity' => $total]);
        } else {
            $product->increment('quantity', $qty);
        }
    }

    // ─── Show allocation preview ──────────────────────────────

    public function show(PurchaseOrder $purchase)
    {
        $purchase->load(['trip', 'items.product']);

        $allocationData = $purchase->items->map(function ($poItem) use ($purchase) {

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
                    'is_partial'    => $allocated > 0 && $allocated < $item->quantity,
                ];
            });

            // Show current catalog stock so user can see before/after.
            $currentStock = null;
            if ($poItem->product_id && $poItem->product) {
                $currentStock = $poItem->color && $poItem->size
                    ? $poItem->product->variantStock($poItem->color, $poItem->size)
                    : $poItem->product->quantity;
            }

            return [
                'po_item_id'      => $poItem->id,
                'product_name'    => $poItem->product_name,
                'product_id'      => $poItem->product_id,
                'color'           => $poItem->color ?? '—',
                'size'            => $poItem->size  ?? '—',
                'qty_needed'      => $totalOrdered,
                'qty_available'   => $qtyAvailable,
                'qty_shortfall'   => $qtyShortfall,
                'has_shortfall'   => $qtyShortfall > 0,
                'current_stock'   => $currentStock,
                'stock_after'     => $currentStock !== null ? $currentStock + $qtyAvailable : null,
                'allocations'     => $allocations,
            ];
        });

        return Inertia::render('purchases/allocate', [
            'purchase'       => $purchase,
            'allocationData' => $allocationData,
        ]);
    }

    // ─── Confirm allocation ───────────────────────────────────

    public function allocate(Request $request, PurchaseOrder $purchase)
    {
        $purchase->load('items.product');

        DB::transaction(function () use ($purchase) {
            foreach ($purchase->items as $poItem) {

                // ── Step 1: Sync product catalog stock ────────────────
                // Add qty_received to the product's catalog stock
                // (variant-aware if the product has variants).
                // Only syncs if the PO item is linked to a catalog product.
                if ($poItem->product_id && $poItem->product) {
                    $product = Product::lockForUpdate()->find($poItem->product_id);
                    if ($product) {
                        $this->incrementProductStock(
                            $product,
                            $poItem->color,
                            $poItem->size,
                            $poItem->qty_received
                        );
                    }
                }

                // ── Step 2: Allocate to keep orders ───────────────────
                // Find all keep orders for this product+color+size,
                // ordered by date (first-come first-served).
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
                        // No stock left — mark as sold out.
                        // Also decrement catalog stock back if linked, since
                        // this customer won't receive the product.
                        $order->update(['status' => 'sold_out']);

                    } elseif ($remaining >= $item->quantity) {
                        // Full allocation — customer gets everything they ordered.
                        // Decrement catalog stock by what this order takes.
                        $remaining -= $item->quantity;

                        if ($poItem->product_id && $poItem->product) {
                            $product = Product::lockForUpdate()->find($poItem->product_id);
                            if ($product) {
                                $this->decrementProductStock(
                                    $product,
                                    $poItem->color,
                                    $poItem->size,
                                    $item->quantity
                                );
                            }
                        }

                        $order->update(['status' => 'bought']);

                    } else {
                        // Partial allocation — customer gets less than requested.
                        // Decrement catalog stock by what's actually given.
                        if ($poItem->product_id && $poItem->product) {
                            $product = Product::lockForUpdate()->find($poItem->product_id);
                            if ($product) {
                                $this->decrementProductStock(
                                    $product,
                                    $poItem->color,
                                    $poItem->size,
                                    $remaining
                                );
                            }
                        }

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

                // ── Step 3: Any stock remaining after all keep orders
                // are fulfilled stays in the catalog for walk-in / future orders.
                // No further action needed — it was already added in Step 1.
            }

            $purchase->update(['status' => 'confirmed']);
        });

        return redirect()->route('purchases.show', $purchase)
            ->with('success', 'Stock allocated! Orders updated and product catalog synced.');
    }

    // ─── Decrement variant stock helper ──────────────────────

    /**
     * Decrement a specific color+size variant's stock.
     * Mirror of incrementProductStock — used when allocating to orders.
     */
    private function decrementProductStock(Product $product, ?string $color, ?string $size, int $qty): void
    {
        $variants = $product->variants ?? [];

        if (!empty($variants) && $color && $size) {
            foreach ($variants as &$v) {
                if (strtoupper($v['color']) === strtoupper($color) &&
                    strtoupper($v['size'])  === strtoupper($size)) {
                    $v['quantity'] = max(0, (int)$v['quantity'] - $qty);
                    break;
                }
            }
            unset($v);
            $total = collect($variants)->sum('quantity');
            $product->update(['variants' => $variants, 'quantity' => $total]);
        } else {
            $product->decrement('quantity', $qty);
        }
    }
}