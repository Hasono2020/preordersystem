import { Head, Link, router } from '@inertiajs/react';
import { Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

const STATUS_COLORS: Record<string, string> = {
    bought:   'bg-green-100 text-green-800',
    keep:     'bg-yellow-100 text-yellow-800',
    sold_out: 'bg-red-100 text-red-800',
};

const STATUS_LABELS: Record<string, string> = {
    bought: 'Bought', keep: 'Keep', sold_out: 'Sold Out',
};

export default function OrderShow({ order }: any) {
    function destroy() {
        if (confirm('Delete this order?')) router.delete(`/orders/${order.id}`);
    }

    return (
        <>
            <Head title={`Order #${order.id}`} />
            <div className="p-6 max-w-3xl space-y-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Link href="/orders" className="text-muted-foreground hover:text-foreground text-sm">← Back</Link>
                        <h1 className="text-xl font-semibold">Order #{order.id}</h1>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[order.status]}`}>
                            {STATUS_LABELS[order.status]}
                        </span>
                    </div>
                    <div className="flex gap-2">
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
                                                                                {new Date(order.order_date).toLocaleDateString('en-GB', {
                                                                                    day: '2-digit', month: 'short', year: 'numeric'
                                                                                })}
                                                                            </p>
                    </div>
                    <div><span className="text-muted-foreground">Courier</span><p className="font-medium">{order.courier ?? '—'}</p></div>
                    <div><span className="text-muted-foreground">Recorded by</span><p className="font-medium">{order.user?.name}</p></div>
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
                    <div className="flex justify-between"><span className="text-muted-foreground">Discount</span><span>- {Number(order.discount).toLocaleString()}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Shipping fee</span><span>{Number(order.shipping_fee).toLocaleString()}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Shipping fee / kg</span><span>{Number(order.shipping_fee_per_kg).toLocaleString()}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Total shipping</span><span>{Number(order.total_shipping_fee).toLocaleString()}</span></div>
                    <div className="flex justify-between font-semibold border-t pt-2"><span>Grand total</span><span>{Number(order.total_price).toLocaleString()}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Down payment</span><span>- {Number(order.down_payment).toLocaleString()}</span></div>
                    <div className="flex justify-between font-semibold text-orange-600"><span>Remaining</span><span>{Number(order.remaining_payment).toLocaleString()}</span></div>
                </div>
            </div>
        </>
    );
}

OrderShow.layout = (page: any) => page;