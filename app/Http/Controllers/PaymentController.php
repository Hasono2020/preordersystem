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

        Payment::create([
            'order_id' => $order->id,
            'amount'   => $request->amount,
            'type'     => 'remaining',
            'paid_at'  => $request->paid_at,
            'note'     => $request->note,
        ]);

        // Recalculate remaining_payment
        $totalPaid           = $order->payments()->sum('amount') + $order->down_payment;
        $remaining           = max($order->total_price - $totalPaid, 0);
        $order->remaining_payment = $remaining;
        $order->save();

        return redirect()->route('orders.show', $order->id)
            ->with('success', 'Payment recorded successfully.');
    }

    public function destroy(Order $order, Payment $payment)
    {
        $payment->delete();

        // Recalculate remaining_payment
        $totalPaid            = $order->payments()->sum('amount') + $order->down_payment;
        $remaining            = max($order->total_price - $totalPaid, 0);
        $order->remaining_payment = $remaining;
        $order->save();

        return redirect()->route('orders.show', $order->id)
            ->with('success', 'Payment removed.');
    }
}