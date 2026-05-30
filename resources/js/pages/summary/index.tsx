import { Head, router, useForm } from '@inertiajs/react';
import { useState, Fragment } from 'react';
import { ChevronDown, ChevronRight, ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function SummaryIndex({ grouped, summary, status }: any) {
    const [expanded, setExpanded] = useState<Record<string, boolean>>({});
    const { data, setData } = useForm({ status });

    function toggleRow(key: string) {
        setExpanded(prev => ({ ...prev, [key]: !prev[key] }));
    }

    function applyFilter(s: string) {
        setData('status', s);
        router.get('/summary', { status: s }, { preserveState: true });
    }

    return (
        <>
            <Head title="Product Summary" />
            <div className="p-6 space-y-6">
                <div>
                    <h1 className="text-2xl font-bold">Product Summary</h1>
                    <p className="text-sm text-muted-foreground mt-0.5">
                        Total orders grouped by product, color and size.
                    </p>
                </div>

                {/* Status filter */}
                <div className="flex gap-2">
                    {[
                        { value: 'keep',     label: '🔒 Keep' },
                        { value: 'bought',   label: '✅ Bought' },
                        { value: 'sold_out', label: '❌ Sold Out' },
                    ].map(s => (
                        <button
                            key={s.value}
                            onClick={() => applyFilter(s.value)}
                            className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                                data.status === s.value
                                    ? 'bg-primary text-primary-foreground border-primary'
                                    : 'hover:bg-muted border-transparent'
                            }`}
                        >
                            {s.label}
                        </button>
                    ))}
                </div>

                {/* Summary cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {[
                        { label: 'Product variants',  value: summary.total_products },
                        { label: 'Total items',       value: summary.total_items },
                        { label: 'Total customers',   value: summary.total_customers },
                        { label: 'Total value',       value: Number(summary.total_value).toLocaleString() },
                    ].map(card => (
                        <div key={card.label} className="rounded-xl border p-4 space-y-1">
                            <p className="text-xs text-muted-foreground uppercase tracking-wide">{card.label}</p>
                            <p className="text-2xl font-bold">{card.value}</p>
                        </div>
                    ))}
                </div>

                {/* Grouped table */}
                {grouped.length === 0 ? (
                    <div className="rounded-2xl border p-12 text-center text-muted-foreground">
                        No orders with status <strong>{status}</strong> found.
                    </div>
                ) : (
                    <div className="rounded-2xl border shadow-sm overflow-hidden">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-xs text-muted-foreground uppercase tracking-wide border-b bg-muted/30">
                                    <th className="text-left px-4 py-3 w-8"></th>
                                    <th className="text-left px-4 py-3">Product</th>
                                    <th className="text-left px-4 py-3">Color</th>
                                    <th className="text-left px-4 py-3">Size</th>
                                    <th className="text-right px-4 py-3">Total Qty</th>
                                    <th className="text-right px-4 py-3">Total Value</th>
                                    <th className="text-right px-4 py-3">Customers</th>
                                </tr>
                            </thead>
                            <tbody>
                                {grouped.map((row: any, idx: number) => {
                                    const key = `${row.product_name}||${row.color}||${row.size}`;
                                    const isOpen = !!expanded[key];
                                    return (
                                        <Fragment key={key}>
                                            <tr
                                                className={`border-b cursor-pointer hover:bg-muted/30 transition-colors ${idx % 2 === 0 ? '' : 'bg-muted/10'}`}
                                                onClick={() => toggleRow(key)}
                                            >
                                                <td className="px-4 py-3 text-muted-foreground">
                                                    {isOpen
                                                        ? <ChevronDown className="size-4" />
                                                        : <ChevronRight className="size-4" />}
                                                </td>
                                                <td className="px-4 py-3 font-mono font-semibold">{row.product_name}</td>
                                                <td className="px-4 py-3">
                                                    <span className="px-2 py-0.5 rounded bg-muted text-xs font-medium">
                                                        {row.color}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className="px-2 py-0.5 rounded border text-xs font-medium">
                                                        {row.size}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-right font-bold text-lg">
                                                    {row.total_qty}
                                                </td>
                                                <td className="px-4 py-3 text-right text-muted-foreground">
                                                    {Number(row.total_value).toLocaleString()}
                                                </td>
                                                <td className="px-4 py-3 text-right text-muted-foreground">
                                                    {row.customers.length}
                                                </td>
                                            </tr>

                                            {/* Expanded customer rows */}
                                            {isOpen && row.customers.map((c: any, ci: number) => (
                                                <tr key={`${key}-${ci}`} className="border-b bg-muted/5">
                                                    <td className="px-4 py-2"></td>
                                                    <td colSpan={2} className="px-4 py-2 text-sm">
                                                        <span className="text-muted-foreground">└</span>
                                                        <span className="ml-2 font-medium">{c.name}</span>
                                                    </td>
                                                    <td className="px-4 py-2 text-xs text-muted-foreground">
                                                        {c.order_date ? new Date(c.order_date).toLocaleDateString('en-GB', {
                                                            day: '2-digit', month: 'short', year: 'numeric'
                                                        }) : '—'}
                                                    </td>
                                                    <td className="px-4 py-2 text-right text-sm">{c.quantity}</td>
                                                    <td className="px-4 py-2 text-right text-sm text-muted-foreground">
                                                        {Number(c.price * c.quantity).toLocaleString()}
                                                    </td>
                                                    <td className="px-4 py-2 text-right">
                                                        <a
                                                            href={`/orders/${c.order_id}`}
                                                            className="text-xs text-primary hover:underline"
                                                            onClick={e => e.stopPropagation()}
                                                        >
                                                            Order #{c.order_id}
                                                        </a>
                                                    </td>
                                                </tr>
                                            ))}
                                        </Fragment>
                                    );
                                })}
                            </tbody>
                            {/* Footer totals */}
                            <tfoot>
                                <tr className="border-t bg-muted/30 font-semibold">
                                    <td colSpan={4} className="px-4 py-3 text-sm">Total</td>
                                    <td className="px-4 py-3 text-right text-lg">{summary.total_items}</td>
                                    <td className="px-4 py-3 text-right">{Number(summary.total_value).toLocaleString()}</td>
                                    <td></td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                )}
            </div>
        </>
    );
}

SummaryIndex.layout = (page: any) => page;