import { Head, Link, router } from '@inertiajs/react';
import { useState } from 'react';
import { ChevronDown, ChevronRight, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function PurchaseAllocate({ purchase, allocationData }: any) {
    const [expanded, setExpanded] = useState<Record<number, boolean>>({});

    function toggle(id: number) {
        setExpanded(prev => ({ ...prev, [id]: !prev[id] }));
    }

    function handleAllocate() {
        if (window.confirm(
            'Apply stock allocation?\n\n' +
            '• Customers who get stock → status changed to BOUGHT\n' +
            '• Customers who don\'t get stock → status changed to SOLD OUT\n\n' +
            'This cannot be undone easily.'
        )) {
            router.post(`/purchases/${purchase.id}/allocate`);
        }
    }

    const totalShortfall = allocationData.filter((r: any) => r.has_shortfall).length;
    const affectedCustomers = allocationData.reduce((sum: number, r: any) =>
        sum + r.allocations.length, 0);
    const soldOutCustomers = allocationData.reduce((sum: number, r: any) =>
        sum + r.allocations.filter((a: any) => !a.will_get).length, 0);

    return (
        <>
            <Head title="Stock Allocation" />
            <div className="p-6 max-w-4xl space-y-6">
                <div className="flex items-center gap-3">
                    <Link href={`/purchases/${purchase.id}`} className="text-muted-foreground hover:text-foreground text-sm">← Back</Link>
                    <h1 className="text-xl font-semibold">Stock Allocation</h1>
                    <span className="text-sm text-muted-foreground">Purchase #{purchase.id}</span>
                </div>

                {/* Explanation */}
                <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800 space-y-1">
                    <p className="font-semibold">How allocation works:</p>
                    <p>• Orders are sorted by date — earliest order gets stock first (first come, first served)</p>
                    <p>• Customers who get enough stock → order changes to <strong>Bought</strong></p>
                    <p>• Customers who don't get stock → order changes to <strong>Sold Out</strong></p>
                </div>

                {/* Summary */}
                <div className="grid grid-cols-3 gap-4">
                    <div className="rounded-xl border p-4 space-y-1">
                        <p className="text-xs text-muted-foreground uppercase tracking-wide">Product variants</p>
                        <p className="text-2xl font-bold">{allocationData.length}</p>
                    </div>
                    <div className="rounded-xl border p-4 space-y-1">
                        <p className="text-xs text-muted-foreground uppercase tracking-wide">Customers affected</p>
                        <p className="text-2xl font-bold">{affectedCustomers}</p>
                    </div>
                    <div className={`rounded-xl border p-4 space-y-1 ${soldOutCustomers > 0 ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50'}`}>
                        <p className="text-xs text-muted-foreground uppercase tracking-wide">Will be sold out</p>
                        <p className={`text-2xl font-bold ${soldOutCustomers > 0 ? 'text-red-600' : 'text-green-600'}`}>
                            {soldOutCustomers}
                        </p>
                    </div>
                </div>

                {/* Allocation preview per variant */}
                <div className="space-y-3">
                    {allocationData.map((row: any) => (
                        <div key={row.po_item_id} className={`rounded-xl border overflow-hidden ${row.has_shortfall ? 'border-amber-300' : 'border-green-200'}`}>
                            {/* Variant header */}
                            <button
                                className={`w-full flex items-center justify-between px-4 py-3 text-sm hover:bg-muted/20 transition-colors ${row.has_shortfall ? 'bg-amber-50' : 'bg-green-50'}`}
                                onClick={() => toggle(row.po_item_id)}
                            >
                                <div className="flex items-center gap-3">
                                    {expanded[row.po_item_id]
                                        ? <ChevronDown className="size-4 text-muted-foreground" />
                                        : <ChevronRight className="size-4 text-muted-foreground" />}
                                    <span className="font-mono font-semibold">{row.product_name}</span>
                                    <span className="px-2 py-0.5 rounded bg-muted text-xs">{row.color}</span>
                                    <span className="px-2 py-0.5 rounded border text-xs">{row.size}</span>
                                </div>
                                <div className="flex items-center gap-4 text-xs">
                                    <span className="text-muted-foreground">
                                        Needed: <strong>{row.qty_needed}</strong>
                                    </span>
                                    <span className="text-muted-foreground">
                                        Available: <strong className={row.has_shortfall ? 'text-amber-600' : 'text-green-600'}>
                                            {row.qty_available}
                                        </strong>
                                    </span>
                                    {row.has_shortfall ? (
                                        <span className="text-amber-600 font-semibold">
                                            ⚠ {row.qty_shortfall} short
                                        </span>
                                    ) : (
                                        <span className="text-green-600 font-semibold">✓ Fully covered</span>
                                    )}
                                    <span className="text-muted-foreground">{row.allocations.length} customers</span>
                                </div>
                            </button>

                            {/* Customer allocation list */}
                            {expanded[row.po_item_id] && (
                                <div className="border-t">
                                    <table className="w-full text-sm">
                                        <thead className="bg-muted/30 text-xs text-muted-foreground">
                                            <tr>
                                                <th className="text-left px-4 py-2">Order</th>
                                                <th className="text-left px-4 py-2">Customer</th>
                                                <th className="text-left px-4 py-2">Order Date</th>
                                                <th className="text-right px-4 py-2">Requested</th>
                                                <th className="text-right px-4 py-2">Gets</th>
                                                <th className="text-left px-4 py-2">Result</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {row.allocations.map((a: any, ai: number) => (
                                                <tr key={ai} className={`border-t ${!a.will_get ? 'bg-red-50/50' : a.fully_filled ? '' : 'bg-amber-50/50'}`}>
                                                    <td className="px-4 py-2.5">
                                                        <Link href={`/orders/${a.order_id}`}
                                                            className="text-primary hover:underline text-xs">
                                                            #{a.order_id}
                                                        </Link>
                                                    </td>
                                                    <td className="px-4 py-2.5 font-medium">{a.customer_name}</td>
                                                    <td className="px-4 py-2.5 text-muted-foreground text-xs">
                                                        {a.order_date ? new Date(a.order_date).toLocaleDateString('en-GB', {
                                                            day: '2-digit', month: 'short', year: 'numeric'
                                                        }) : '—'}
                                                    </td>
                                                    <td className="px-4 py-2.5 text-right">{a.qty_requested}</td>
                                                    <td className="px-4 py-2.5 text-right font-semibold">
                                                        {a.qty_allocated}
                                                    </td>
                                                    <td className="px-4 py-2.5">
                                                        {a.will_get ? (
                                                            <span className="flex items-center gap-1 text-green-600 text-xs font-medium">
                                                                <CheckCircle className="size-3" /> Bought
                                                            </span>
                                                        ) : (
                                                            <span className="flex items-center gap-1 text-red-500 text-xs font-medium">
                                                                <XCircle className="size-3" /> Sold Out
                                                            </span>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                {allocationData.length === 0 && (
                    <div className="rounded-2xl border p-12 text-center text-muted-foreground">
                        No matching keep orders found for items in this purchase.
                    </div>
                )}

                {/* Confirm button */}
                {allocationData.length > 0 && (
                    <div className="flex gap-3 items-center">
                        <Button
                            onClick={handleAllocate}
                            className="bg-blue-600 hover:bg-blue-700"
                        >
                            ⚖️ Apply Allocation — Update {affectedCustomers} Orders
                        </Button>
                        <Link href={`/purchases/${purchase.id}`}>
                            <Button variant="outline">Cancel</Button>
                        </Link>
                        {soldOutCustomers > 0 && (
                            <p className="text-xs text-muted-foreground">
                                {soldOutCustomers} customer{soldOutCustomers > 1 ? 's' : ''} will be marked as Sold Out
                            </p>
                        )}
                    </div>
                )}
            </div>
        </>
    );
}

PurchaseAllocate.layout = (page: any) => page;