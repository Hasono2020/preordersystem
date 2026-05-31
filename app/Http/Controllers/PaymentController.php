<?php

namespace App\Http\Controllers;

use App\Models\Order;
use App\Models\Payment;
use Illuminate\Http\Request;

class PaymentController extends Controller
{
    public function store(Request $request, Order $order)
    {
        $request->validate([
            'amount'  => 'required|numeric|min:1',
            'paid_at' => 'required|date',
            'note'    => 'nullable|string|max:255',
        ]);

        if ($request->amount > $order->remaining_payment) {
            return back()->withErrors([
                'amount' => 'Payment amount exceeds the remaining balance of ' .
                            number_format($order->remaining_payment) . '.',
            ])->withInput();
        }

        Payment::create([
            'order_id' => $order->id,
            'amount'   => $request->amount,
            'type'     => 'remaining',
            'paid_at'  => $request->paid_at,
            'note'     => $request->note,
        ]);

        $totalSubsequent = $order->payments()->sum('amount');
        $remaining       = max($order->total_price - $order->down_payment - $totalSubsequent, 0);

        // FIX 8: Use update() instead of direct property assignment so model
        // events and observers fire consistently with the rest of the codebase.
        $order->update(['remaining_payment' => $remaining]);

        return redirect()->route('orders.show', $order->id)
            ->with('success', 'Payment recorded successfully.');
    }

    public function destroy(Order $order, Payment $payment)
    {
        if ($payment->order_id !== $order->id) {
            abort(403, 'This payment does not belong to this order.');
        }

        $payment->delete();

        $totalSubsequent = $order->payments()->sum('amount');
        $remaining       = max($order->total_price - $order->down_payment - $totalSubsequent, 0);

        // FIX 8: Same — use update() for consistency.
        $order->update(['remaining_payment' => $remaining]);

        return redirect()->route('orders.show', $order->id)
            ->with('success', 'Payment removed.');
    }
}