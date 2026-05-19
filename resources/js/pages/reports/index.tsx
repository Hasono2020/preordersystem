import { Head, router, useForm } from '@inertiajs/react';
import { Button } from '@/components/ui/button';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

export default function ReportsIndex({ data, summary, period, year, month }: any) {
    const { data: filters, setData } = useForm({ period, year: String(year), month: String(month) });

    function apply() {
        router.get('/reports', filters, { preserveState: true });
    }

    const maxSales = Math.max(...data.map((r: any) => Number(r.total_sales)), 1);

    return (
        <>
            <Head title="Reports" />
            <div className="p-6 space-y-6">
                <h1 className="text-xl font-semibold">Sales Reports</h1>

                {/* Filters */}
                <div className="flex flex-wrap gap-3 items-end">
                    <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">Period</p>
                        <select
                            className="rounded-md border px-3 py-2 text-sm bg-background"
                            value={filters.period}
                            onChange={e => setData('period', e.target.value)}
                        >
                            <option value="monthly">Monthly</option>
                            <option value="daily">Daily</option>
                        </select>
                    </div>
                    <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">Year</p>
                        <select
                            className="rounded-md border px-3 py-2 text-sm bg-background"
                            value={filters.year}
                            onChange={e => setData('year', e.target.value)}
                        >
                            {[2024, 2025, 2026].map(y => (
                                <option key={y} value={y}>{y}</option>
                            ))}
                        </select>
                    </div>
                    {filters.period === 'daily' && (
                        <div className="space-y-1">
                            <p className="text-xs text-muted-foreground">Month</p>
                            <select
                                className="rounded-md border px-3 py-2 text-sm bg-background"
                                value={filters.month}
                                onChange={e => setData('month', e.target.value)}
                            >
                                {MONTHS.map((m, i) => (
                                    <option key={i+1} value={i+1}>{m}</option>
                                ))}
                            </select>
                        </div>
                    )}
                    <Button onClick={apply} size="sm">Apply</Button>
                </div>

                {/* Summary cards */}
                <div className="grid grid-cols-2 gap-4 max-w-md">
                    <div className="rounded-xl border p-4 space-y-1">
                        <p className="text-xs text-muted-foreground">Total orders</p>
                        <p className="text-2xl font-semibold">{summary.total_orders}</p>
                    </div>
                    <div className="rounded-xl border p-4 space-y-1">
                        <p className="text-xs text-muted-foreground">Total sales</p>
                        <p className="text-2xl font-semibold">{Number(summary.total_sales).toLocaleString()}</p>
                    </div>
                </div>

                {/* Bar chart */}
                {data.length > 0 ? (
                    <div className="space-y-2">
                        <h2 className="font-medium text-sm text-muted-foreground">
                            {filters.period === 'monthly' ? `Monthly breakdown — ${filters.year}` : `Daily breakdown — ${MONTHS[Number(filters.month)-1]} ${filters.year}`}
                        </h2>
                        <div className="rounded-xl border p-4 space-y-3">
                            {data.map((row: any) => (
                                <div key={row.label} className="space-y-1">
                                    <div className="flex justify-between text-sm">
                                        <span className="font-medium w-28 truncate">{row.label}</span>
                                        <span className="text-muted-foreground">{row.total_orders} orders</span>
                                        <span className="font-semibold">{Number(row.total_sales).toLocaleString()}</span>
                                    </div>
                                    <div className="h-3 rounded-full bg-muted overflow-hidden">
                                        <div
                                            className="h-full rounded-full bg-blue-500 transition-all duration-500"
                                            style={{ width: `${(Number(row.total_sales) / maxSales) * 100}%` }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="rounded-xl border p-12 text-center text-muted-foreground">
                        No sales data for the selected period.
                    </div>
                )}

                {/* Data table */}
                {data.length > 0 && (
                    <div className="rounded-xl border overflow-hidden">
                        <table className="w-full text-sm">
                            <thead className="bg-muted text-muted-foreground">
                                <tr>
                                    <th className="text-left px-4 py-3">Period</th>
                                    <th className="text-right px-4 py-3">Orders</th>
                                    <th className="text-right px-4 py-3">Total Sales</th>
                                    <th className="text-right px-4 py-3">Avg per Order</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.map((row: any) => (
                                    <tr key={row.label} className="border-t hover:bg-muted/40">
                                        <td className="px-4 py-3 font-medium">{row.label}</td>
                                        <td className="px-4 py-3 text-right">{row.total_orders}</td>
                                        <td className="px-4 py-3 text-right">{Number(row.total_sales).toLocaleString()}</td>
                                        <td className="px-4 py-3 text-right">
                                            {row.total_orders > 0
                                                ? Math.round(row.total_sales / row.total_orders).toLocaleString()
                                                : '—'}
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

ReportsIndex.layout = (page: any) => page;