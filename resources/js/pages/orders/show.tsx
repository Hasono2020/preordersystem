import { Head, Link, router, useForm } from '@inertiajs/react';
import { Pencil, Trash2, Printer, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const STATUS_COLORS: Record<string, string> = {
    bought:   'bg-green-100 text-green-800',
    keep:     'bg-yellow-100 text-yellow-800',
    sold_out: 'bg-red-100 text-red-800',
};

const STATUS_LABELS: Record<string, string> = {
    bought: 'Bought', keep: 'Keep', sold_out: 'Sold Out',
};

function PaymentForm({ orderId, remaining }: { orderId: number; remaining: number }) {
    const { data, setData, post, processing, reset, errors } = useForm({
        amount:  '',
        paid_at: new Date().toISOString().slice(0, 10),
        note:    '',
    });

    function submit(e: React.FormEvent) {
        e.preventDefault();
        post(`/orders/${orderId}/payments`, { onSuccess: () => reset() });
    }

    return (
        <form onSubmit={submit} className="border rounded-lg p-4 space-y-3 bg-muted/30">
            <p className="text-sm font-medium">Record a payment</p>
            <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                    <Label className="text-xs">Amount (max: Rp{remaining.toLocaleString()})</Label>
                    <Input
                        type="number" min="1" max={remaining}
                        placeholder="e.g. 500000"
                        value={data.amount}
                        onChange={e => setData('amount', e.target.value)}
                    />
                    {errors.amount && <p className="text-xs text-destructive">{errors.amount}</p>}
                </div>
                <div className="space-y-1">
                    <Label className="text-xs">Date</Label>
                    <Input
                        type="date"
                        value={data.paid_at}
                        onChange={e => setData('paid_at', e.target.value)}
                    />
                </div>
            </div>
            <div className="space-y-1">
                <Label className="text-xs">Note (optional)</Label>
                <Input
                    placeholder="e.g. Transfer BCA"
                    value={data.note}
                    onChange={e => setData('note', e.target.value)}
                />
            </div>
            <Button type="submit" size="sm" disabled={processing || !data.amount}>
                <Plus className="size-4 mr-1" /> Add Payment
            </Button>
        </form>
    );
}

export default function OrderShow({ order }: any) {
    function destroy() {
        if (confirm('Delete this order?')) router.delete(`/orders/${order.id}`);
    }

    function removePayment(paymentId: number) {
        if (confirm('Remove this payment?'))
            router.delete(`/orders/${order.id}/payments/${paymentId}`);
    }

    const discountProduct  = Number(order.discount_product  ?? 0);
    const discountShipping = Number(order.discount_shipping ?? 0);
    const totalDiscount    = Number(order.discount);
    const hasBreakdown     = discountProduct > 0 || discountShipping > 0;
    const itemsTotal       = order.items.reduce((s: number, i: any) => s + Number(i.total_price), 0);
    const payments         = order.payments ?? [];
    // totalPaid = down_payment + all subsequent payments
    const totalSubsequent  = payments.reduce((s: number, p: any) => s + Number(p.amount), 0);
    const totalPaid        = Number(order.down_payment) + totalSubsequent;
    const isFullyPaid      = Number(order.remaining_payment) <= 0;

    return (
        <>
            <Head title={`Order #${order.id}`} />
            <div className="p-6 max-w-3xl space-y-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Link href="/orders" className="text-muted-foreground hover:text-foreground text-sm">← Back</Link>
                        <h1 className="text-xl font-semibold">Order #{order.id}</h1>
                        {/* Summary of item statuses */}
                        {(() => {
                            const counts: Record<string, number> = {};
                            (order.items ?? []).forEach((item: any) => {
                                counts[item.status] = (counts[item.status] ?? 0) + 1;
                            });
                            return Object.entries(counts).map(([status, count]) => (
                                <span key={status} className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[status] ?? ''}`}>
                                    {STATUS_LABELS[status] ?? status} ×{count}
                                </span>
                            ));
                        })()}
                    </div>
                    <div className="flex gap-2">
                        <button onClick={() => window.open(`/customers/${order.customer_id}/print`, '_blank')}
                            className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm hover:bg-accent transition-colors">
                            <Printer className="size-4" /> Print Report
                        </button>
                        <Link href={`/orders/${order.id}/edit`}>
                            <Button variant="outline" size="sm"><Pencil className="size-4 mr-1" /> Edit</Button>
                        </Link>
                        <Button variant="destructive" size="sm" onClick={destroy}>
                            <Trash2 className="size-4 mr-1" /> Delete
                        </Button>
                    </div>
                </div>

                {/* Info grid */}
                <div className="grid grid-cols-2 gap-4 rounded-lg border p-4 text-sm">
                    <div><span className="text-muted-foreground">Customer</span><p className="font-medium">{order.customer?.name}</p></div>
                    <div><span className="text-muted-foreground">Date</span><p className="font-medium">
                        {new Date(order.order_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </p></div>
                    <div><span className="text-muted-foreground">Courier</span><p className="font-medium">{order.courier ?? '—'}</p></div>
                    <div><span className="text-muted-foreground">Recorded by</span><p className="font-medium">{order.user?.name ?? <span className="text-muted-foreground italic">Deleted user</span>}</p></div>
                    {order.notes && (
                        <div className="col-span-2"><span className="text-muted-foreground">Notes</span><p>{order.notes}</p></div>
                    )}
                </div>

                {/* Items */}
                <div className="space-y-2">
                    <h2 className="font-medium">Items</h2>
                    <div className="rounded-lg border overflow-hidden">
                        <table className="w-full text-sm">
                            <thead className="bg-muted text-muted-foreground">
                                <tr>
                                    <th className="text-left px-4 py-2">Product</th>
                                    <th className="text-left px-4 py-2">Color</th>
                                    <th className="text-left px-4 py-2">Size</th>
                                    <th className="text-right px-4 py-2">Qty</th>
                                    <th className="text-right px-4 py-2">Price</th>
                                    <th className="text-left px-4 py-2">Status</th>
                                    <th className="text-right px-4 py-2">Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                {order.items.map((item: any) => (
                                    <tr key={item.id} className="border-t">
                                        <td className="px-4 py-2 font-medium">{item.product_name}</td>
                                        <td className="px-4 py-2 text-muted-foreground">{item.color ?? '—'}</td>
                                        <td className="px-4 py-2 text-muted-foreground">{item.size ?? '—'}</td>
                                        <td className="px-4 py-2 text-right">{item.quantity}</td>
                                        <td className="px-4 py-2 text-right">{Number(item.price).toLocaleString()}</td>
                                        <td className="px-4 py-2">
                                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[item.status] ?? STATUS_COLORS['keep']}`}>
                                                {STATUS_LABELS[item.status] ?? item.status}
                                            </span>
                                        </td>
                                        <td className="px-4 py-2 text-right font-medium">{Number(item.total_price).toLocaleString()}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Payment summary */}
                <div className="rounded-lg border p-4 space-y-2 text-sm">
                    <h2 className="font-medium mb-3">Payment summary</h2>

                    <div className="flex justify-between">
                        <span className="text-muted-foreground">Items subtotal</span>
                        <span>{itemsTotal.toLocaleString()}</span>
                    </div>

                    {totalDiscount > 0 && (
                        <div className="rounded-lg bg-green-50 border border-green-200 px-3 py-2.5 space-y-1.5">
                            <p className="text-xs font-semibold text-green-700">🎉 Promo discount</p>
                            {hasBreakdown ? (
                                <>
                                    {discountProduct > 0 && (
                                        <div className="flex justify-between text-green-700">
                                            <span>Product discount</span>
                                            <span className="font-medium">- {discountProduct.toLocaleString()}</span>
                                        </div>
                                    )}
                                    {discountShipping > 0 && (
                                        <div className="flex justify-between text-green-700">
                                            <span>Shipping fee deduction</span>
                                            <span className="font-medium">- {discountShipping.toLocaleString()}</span>
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div className="flex justify-between text-green-700">
                                    <span>Discount</span>
                                    <span className="font-medium">- {totalDiscount.toLocaleString()}</span>
                                </div>
                            )}
                            <div className="flex justify-between text-green-800 font-semibold border-t border-green-200 pt-1.5">
                                <span>Total savings</span>
                                <span>- {totalDiscount.toLocaleString()}</span>
                            </div>
                        </div>
                    )}

                    <div className="flex justify-between">
                        <span className="text-muted-foreground">Shipping</span>
                        <span>+ {Number(order.total_shipping_fee).toLocaleString()}</span>
                    </div>

                    <div className="flex justify-between font-semibold border-t pt-2">
                        <span>Grand total</span>
                        <span>{Number(order.total_price).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">Down payment (initial)</span>
                        <span>- {Number(order.down_payment).toLocaleString()}</span>
                    </div>

                    {/* Subsequent payments */}
                    {payments.map((p: any) => (
                        <div key={p.id} className="flex justify-between items-center text-sm">
                            <span className="text-muted-foreground">
                                Payment — {new Date(p.paid_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                                {p.note && <span className="ml-1 italic">({p.note})</span>}
                            </span>
                            <div className="flex items-center gap-2">
                                <span>- {Number(p.amount).toLocaleString()}</span>
                                <button onClick={() => removePayment(p.id)}
                                    className="text-destructive hover:text-destructive/70 text-xs">✕</button>
                            </div>
                        </div>
                    ))}

                    <div className={`flex justify-between font-semibold pt-1 border-t ${isFullyPaid ? 'text-green-600' : 'text-orange-600'}`}>
                        <span>{isFullyPaid ? '✓ Fully paid' : 'Remaining'}</span>
                        <span>{isFullyPaid ? 'PAID' : Number(order.remaining_payment).toLocaleString()}</span>
                    </div>
                </div>

                {/* Payment recording — only show if there's still a balance */}
                {!isFullyPaid && (
                    <div className="space-y-2">
                        <h2 className="font-medium">Record payment</h2>
                        <PaymentForm orderId={order.id} remaining={Number(order.remaining_payment)} />
                    </div>
                )}
            </div>
        </>
    );
}

OrderShow.layout = (page: any) => page;