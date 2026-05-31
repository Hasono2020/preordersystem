import { Head, Link, router } from '@inertiajs/react';
import { Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function PurchaseShow({ purchase }: any) {
    function destroy() {
        if (confirm('Delete this purchase order?')) router.delete(`/purchases/${purchase.id}`);
    }

    const shortfall = purchase.items.filter((i: any) => i.qty_received < i.qty_ordered);

    return (
        <>
            <Head title={`Purchase #${purchase.id}`} />
            <div className="p-6 max-w-4xl space-y-6">
                <div className="flex items-start justify-between">
                    <div>
                        <div className="flex items-center gap-3">
                            <Link href="/purchases" className="text-muted-foreground hover:text-foreground text-sm">← Purchases</Link>
                            <h1 className="text-2xl font-bold">Purchase #{purchase.id}</h1>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${purchase.status === 'confirmed' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                                {purchase.status === 'confirmed' ? 'Confirmed' : 'Draft'}
                            </span>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                            {purchase.purchase_date && new Date(purchase.purchase_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}
                            {purchase.supplier_name && ` · ${purchase.supplier_name}`}
                            {purchase.trip && ` · ${purchase.trip.name}`}
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <Link href={`/purchases/${purchase.id}/allocate`}>
                            <Button variant="default" size="sm" className="bg-blue-600 hover:bg-blue-700">
                                ⚖️ Allocate Stock
                            </Button>
                        </Link>
                        <Link href={`/purchases/${purchase.id}/edit`}>
                            <Button variant="outline" size="sm"><Pencil className="size-4 mr-1" /> Edit</Button>
                        </Link>
                        <Button variant="destructive" size="sm" onClick={destroy}>
                            <Trash2 className="size-4 mr-1" /> Delete
                        </Button>
                    </div>
                </div>

                {/* Shortfall warning */}
                {shortfall.length > 0 && (
                    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-1">
                        <p className="font-semibold text-amber-800 text-sm">⚠ Shortfall detected — {shortfall.length} item(s) received less than ordered</p>
                        <p className="text-xs text-amber-700">
                            Go to <Link href={`/purchases/${purchase.id}/allocate`} className="underline">Stock Allocation</Link> to assign available stock to customers.
                        </p>
                    </div>
                )}

                {/* Items table */}
                <div className="rounded-2xl border overflow-hidden shadow-sm">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="text-xs text-muted-foreground uppercase tracking-wide border-b bg-muted/30">
                                <th className="text-left px-6 py-3">Product</th>
                                <th className="text-left px-6 py-3">Color</th>
                                <th className="text-left px-6 py-3">Size</th>
                                <th className="text-right px-6 py-3">Qty Needed</th>
                                <th className="text-right px-6 py-3">Qty Got</th>
                                <th className="text-right px-6 py-3">Cost/unit</th>
                                <th className="text-right px-6 py-3">Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            {purchase.items.map((item: any, idx: number) => (
                                <tr key={item.id}
                                    className={`border-b last:border-0 ${item.qty_received < item.qty_ordered ? 'bg-amber-50/50' : idx % 2 === 0 ? '' : 'bg-muted/10'}`}>
                                    <td className="px-6 py-3.5 font-mono font-semibold">{item.product_name}</td>
                                    <td className="px-6 py-3.5"><span className="px-2 py-0.5 rounded bg-muted text-xs">{item.color ?? '—'}</span></td>
                                    <td className="px-6 py-3.5"><span className="px-2 py-0.5 rounded border text-xs">{item.size ?? '—'}</span></td>
                                    <td className="px-6 py-3.5 text-right">{item.qty_ordered}</td>
                                    <td className="px-6 py-3.5 text-right">
                                        <span className={item.qty_received < item.qty_ordered ? 'text-amber-600 font-semibold' : 'text-green-600 font-semibold'}>
                                            {item.qty_received}
                                        </span>
                                        {item.qty_received < item.qty_ordered && (
                                            <span className="text-xs text-amber-600 ml-1">
                                                (-{item.qty_ordered - item.qty_received})
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-6 py-3.5 text-right">{Number(item.cost_price).toLocaleString()}</td>
                                    <td className="px-6 py-3.5 text-right font-semibold">{Number(item.total_cost).toLocaleString()}</td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot>
                            <tr className="border-t bg-muted/30">
                                <td colSpan={6} className="px-6 py-3 font-semibold text-sm">Total Cost</td>
                                <td className="px-6 py-3 text-right font-bold">{Number(purchase.total_cost).toLocaleString()}</td>
                            </tr>
                        </tfoot>
                    </table>
                </div>

                {purchase.notes && (
                    <div className="rounded-xl border p-4 text-sm">
                        <p className="text-muted-foreground text-xs mb-1">Notes</p>
                        <p>{purchase.notes}</p>
                    </div>
                )}
            </div>
        </>
    );
}

PurchaseShow.layout = (page: any) => page;