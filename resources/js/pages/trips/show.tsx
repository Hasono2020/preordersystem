import { Head, Link, router, usePage } from '@inertiajs/react';
import { useState } from 'react';
import { Pencil, ChevronDown, ChevronRight, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';

const STATUS_COLORS: Record<string, string> = {
    bought:   'bg-green-100 text-green-700',
    keep:     'bg-yellow-100 text-yellow-700',
    sold_out: 'bg-red-100 text-red-700',
};

export default function TripShow({ trip, productSummary, stats }: any) {
    const { flash } = usePage().props as any;
    const [expanded, setExpanded] = useState<Record<string, boolean>>({});
    const [activeTab, setActiveTab] = useState<'summary' | 'orders'>('summary');

    function toggle(key: string) {
        setExpanded(prev => ({ ...prev, [key]: !prev[key] }));
    }

    return (
        <>
            <Head title={trip.name} />
            <div className="p-6 space-y-6">

                {/* Header */}
                <div className="flex items-start justify-between">
                    <div>
                        <div className="flex items-center gap-3">
                            <Link href="/trips" className="text-muted-foreground hover:text-foreground text-sm">← Trips</Link>
                            <h1 className="text-2xl font-bold">{trip.name}</h1>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${trip.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-muted text-muted-foreground'}`}>
                                {trip.status === 'active' ? 'Active' : 'Closed'}
                            </span>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                            {trip.location && <span>{trip.location} · </span>}
                            {trip.start_date && <span>{new Date(trip.start_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>}
                            {trip.end_date && <span> → {new Date(trip.end_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>}
                        </p>
                    </div>
                    <Link href={`/trips/${trip.id}/edit`}>
                        <Button variant="outline" size="sm"><Pencil className="size-4 mr-1" /> Edit</Button>
                    </Link>
                </div>

                {flash?.success && (
                    <div className="rounded-md bg-green-50 border border-green-200 px-4 py-2 text-sm text-green-800">
                        {flash.success}
                    </div>
                )}

                {/* Stats */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                    {[
                        { label: 'Total Orders',  value: stats.total_orders,                         color: '' },
                        { label: 'Keep',          value: stats.keep_orders,                          color: 'text-yellow-600' },
                        { label: 'Bought',        value: stats.bought_orders,                        color: 'text-green-600' },
                        { label: 'Sold Out',      value: stats.soldout_orders,                       color: 'text-red-500' },
                        { label: 'Total Value',   value: Number(stats.total_value).toLocaleString(),     color: '' },
                        { label: 'Remaining',     value: Number(stats.total_remaining).toLocaleString(), color: 'text-orange-500' },
                    ].map(s => (
                        <div key={s.label} className="rounded-xl border p-3 space-y-1">
                            <p className="text-xs text-muted-foreground">{s.label}</p>
                            <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
                        </div>
                    ))}
                </div>

                {/* Tabs */}
                <div className="flex border-b gap-6">
                    {(['summary', 'orders'] as const).map(tab => (
                        <button key={tab} onClick={() => setActiveTab(tab)}
                            className={`pb-2 text-sm font-medium capitalize border-b-2 transition-colors ${activeTab === tab ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
                            {tab === 'summary' ? '📋 Product Summary (Keep)' : '📦 All Orders'}
                        </button>
                    ))}
                </div>

                {/* Product Summary Tab */}
                {activeTab === 'summary' && (
                    <div className="space-y-3">
                        <p className="text-sm text-muted-foreground">
                            Products needed from supplier based on <strong>Keep</strong> orders — your buying list.
                        </p>
                        {productSummary.length === 0 ? (
                            <div className="rounded-2xl border p-12 text-center text-muted-foreground">
                                No keep orders for this trip yet.
                            </div>
                        ) : (
                            <div className="rounded-2xl border shadow-sm overflow-hidden">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="text-xs text-muted-foreground uppercase tracking-wide border-b bg-muted/30">
                                            <th className="w-8 px-4 py-3"></th>
                                            <th className="text-left px-4 py-3">Product</th>
                                            <th className="text-left px-4 py-3">Color</th>
                                            <th className="text-left px-4 py-3">Size</th>
                                            <th className="text-right px-4 py-3">Total Qty</th>
                                            <th className="text-right px-4 py-3">Customers</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {productSummary.map((row: any, idx: number) => {
                                            const key = `${row.product_name}||${row.color}||${row.size}`;
                                            return (
                                                <>
                                                    <tr key={key}
                                                        className="border-b cursor-pointer hover:bg-muted/30"
                                                        onClick={() => toggle(key)}>
                                                        <td className="px-4 py-3 text-muted-foreground">
                                                            {expanded[key] ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
                                                        </td>
                                                        <td className="px-4 py-3 font-mono font-semibold">{row.product_name}</td>
                                                        <td className="px-4 py-3"><span className="px-2 py-0.5 rounded bg-muted text-xs">{row.color}</span></td>
                                                        <td className="px-4 py-3"><span className="px-2 py-0.5 rounded border text-xs">{row.size}</span></td>
                                                        <td className="px-4 py-3 text-right font-bold text-lg">{row.total_qty}</td>
                                                        <td className="px-4 py-3 text-right text-muted-foreground">{row.customers.length}</td>
                                                    </tr>
                                                    {expanded[key] && row.customers.map((c: any, ci: number) => (
                                                        <tr key={`${key}-${ci}`} className="border-b bg-muted/5">
                                                            <td></td>
                                                            <td colSpan={3} className="px-4 py-2 text-sm">
                                                                <span className="text-muted-foreground">└</span>
                                                                <span className="ml-2 font-medium">{c.name}</span>
                                                            </td>
                                                            <td className="px-4 py-2 text-right text-sm">{c.quantity}</td>
                                                            <td className="px-4 py-2 text-right">
                                                                <a href={`/orders/${c.order_id}`}
                                                                    className="text-xs text-primary hover:underline inline-flex items-center gap-1"
                                                                    onClick={e => e.stopPropagation()}>
                                                                    #{c.order_id} <ExternalLink className="size-3" />
                                                                </a>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </>
                                            );
                                        })}
                                    </tbody>
                                    <tfoot>
                                        <tr className="border-t bg-muted/30 font-semibold">
                                            <td colSpan={4} className="px-4 py-3 text-sm">Total items to buy</td>
                                            <td className="px-4 py-3 text-right text-lg">
                                                {productSummary.reduce((s: number, r: any) => s + r.total_qty, 0)}
                                            </td>
                                            <td></td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        )}
                    </div>
                )}

                {/* All Orders Tab */}
                {activeTab === 'orders' && (
                    <div className="rounded-2xl border shadow-sm overflow-hidden">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-xs text-muted-foreground uppercase tracking-wide border-b bg-muted/30">
                                    <th className="text-left px-6 py-3">Date</th>
                                    <th className="text-left px-6 py-3">Customer</th>
                                    <th className="text-left px-6 py-3">Status</th>
                                    <th className="text-right px-6 py-3">Total</th>
                                    <th className="text-right px-6 py-3">Remaining</th>
                                    <th className="px-6 py-3"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {trip.orders.length === 0 && (
                                    <tr><td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">No orders in this trip yet.</td></tr>
                                )}
                                {trip.orders.map((o: any, idx: number) => (
                                    <tr key={o.id} className={`border-b last:border-0 hover:bg-muted/30 ${idx % 2 === 0 ? '' : 'bg-muted/10'}`}>
                                        <td className="px-6 py-3.5 text-muted-foreground">
                                            {new Date(o.order_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                                        </td>
                                        <td className="px-6 py-3.5 font-medium">{o.customer?.name}</td>
                                        <td className="px-6 py-3.5">
                                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[o.status]}`}>
                                                {o.status === 'bought' ? 'Bought' : o.status === 'keep' ? 'Keep' : 'Sold Out'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-3.5 text-right">{Number(o.total_price).toLocaleString()}</td>
                                        <td className="px-6 py-3.5 text-right text-orange-600">
                                            {Number(o.remaining_payment) > 0 ? Number(o.remaining_payment).toLocaleString() : '—'}
                                        </td>
                                        <td className="px-6 py-3.5 text-right">
                                            <Link href={`/orders/${o.id}`} className="text-xs text-primary hover:underline">
                                                View
                                            </Link>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </>
    );
}

TripShow.layout = (page: any) => page;