import { Head, router, useForm } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { TrendingUp, ShoppingCart } from 'lucide-react';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

export default function ReportsIndex({ data, summary, period, year, month, availableYears }: any) {
    const { data: filters, setData } = useForm({
        period, year: String(year), month: String(month),
    });

    function apply() {
        router.get('/reports', filters, { preserveState: true });
    }

    const maxSales = Math.max(...data.map((r: any) => Number(r.total_sales)), 1);

    return (
        <>
            <Head title="Reports" />
            <div className="p-6 space-y-6">

                {/* Header */}
                <div>
                    <h1 className="text-2xl font-bold">Sales Reports</h1>
                    <p className="text-sm text-muted-foreground mt-0.5">Track your sales performance over time.</p>
                </div>

                {/* Filters */}
                <div className="flex flex-wrap gap-3 items-end">
                    <div className="space-y-1">
                        <p className="text-xs font-medium text-muted-foreground">Period</p>
                        <select
                            className="rounded-xl border px-3 py-2 text-sm bg-background shadow-sm"
                            value={filters.period}
                            onChange={e => setData('period', e.target.value)}
                        >
                            <option value="monthly">Monthly</option>
                            <option value="daily">Daily</option>
                        </select>
                    </div>
                    <div className="space-y-1">
                        <p className="text-xs font-medium text-muted-foreground">Year</p>
                        <select
                            className="rounded-xl border px-3 py-2 text-sm bg-background shadow-sm"
                            value={filters.year}
                            onChange={e => setData('year', e.target.value)}
                        >
                            {(availableYears ?? [2024, 2025, 2026]).map((y: number) => (
                                <option key={y} value={y}>{y}</option>
                            ))}
                        </select>
                    </div>
                    {filters.period === 'daily' && (
                        <div className="space-y-1">
                            <p className="text-xs font-medium text-muted-foreground">Month</p>
                            <select
                                className="rounded-xl border px-3 py-2 text-sm bg-background shadow-sm"
                                value={filters.month}
                                onChange={e => setData('month', e.target.value)}
                            >
                                {MONTHS.map((m, i) => (
                                    <option key={i+1} value={i+1}>{m}</option>
                                ))}
                            </select>
                        </div>
                    )}
                    <Button onClick={apply} size="sm" className="rounded-xl">Apply</Button>
                </div>

                {/* Summary cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 max-w-lg">
                    <div className="rounded-2xl overflow-hidden shadow-sm">
                        <div className="bg-linear-to-br from-sky-400 to-sky-500 p-5 text-white">
                            <div className="rounded-xl bg-white/20 p-2.5 w-fit mb-3">
                                <ShoppingCart className="size-5 text-white" />
                            </div>
                            <p className="text-3xl font-bold">{summary.total_orders}</p>
                            <p className="text-sm text-white/90 mt-0.5">Total Orders</p>
                        </div>
                    </div>
                    <div className="rounded-2xl overflow-hidden shadow-sm">
                        <div className="bg-linear-to-br from-green-400 to-green-500 p-5 text-white">
                            <div className="rounded-xl bg-white/20 p-2.5 w-fit mb-3">
                                <TrendingUp className="size-5 text-white" />
                            </div>
                            <p className="text-3xl font-bold">{Number(summary.total_sales).toLocaleString()}</p>
                            <p className="text-sm text-white/90 mt-0.5">Total Sales</p>
                        </div>
                    </div>
                </div>

                {/* Bar chart */}
                {data.length > 0 ? (
                    <div className="rounded-2xl border shadow-sm overflow-hidden">
                        <div className="px-6 py-4 border-b bg-muted/30">
                            <h2 className="font-semibold text-base">
                                {filters.period === 'monthly'
                                    ? `Monthly breakdown — ${filters.year}`
                                    : `Daily breakdown — ${MONTHS[Number(filters.month)-1]} ${filters.year}`}
                            </h2>
                        </div>
                        <div className="p-6 space-y-4">
                            {data.map((row: any) => (
                                <div key={row.label} className="space-y-1.5">
                                    <div className="flex justify-between text-sm">
                                        <span className="font-medium w-32 truncate">{row.label}</span>
                                        <span className="text-muted-foreground text-xs">{row.total_orders} orders</span>
                                        <span className="font-semibold">{Number(row.total_sales).toLocaleString()}</span>
                                    </div>
                                    <div className="h-3 rounded-full bg-muted overflow-hidden">
                                        <div
                                            className="h-full rounded-full bg-linear-to-r from-sky-400 to-sky-500 transition-all duration-700"
                                            style={{ width: `${(Number(row.total_sales) / maxSales) * 100}%` }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="rounded-2xl border p-12 text-center text-muted-foreground shadow-sm">
                        No sales data for the selected period.
                    </div>
                )}

                {/* Table */}
                {data.length > 0 && (
                    <div className="rounded-2xl border shadow-sm overflow-hidden">
                        <div className="px-6 py-4 border-b bg-muted/30">
                            <h2 className="font-semibold text-base">Breakdown Table</h2>
                        </div>
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-xs text-muted-foreground uppercase tracking-wide border-b">
                                    <th className="text-left px-6 py-3">Period</th>
                                    <th className="text-right px-6 py-3">Orders</th>
                                    <th className="text-right px-6 py-3">Total Sales</th>
                                    <th className="text-right px-6 py-3">Avg / Order</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.map((row: any, idx: number) => (
                                    <tr key={row.label}
                                        className={`border-b last:border-0 hover:bg-muted/30 transition-colors ${idx % 2 === 0 ? '' : 'bg-muted/10'}`}>
                                        <td className="px-6 py-3.5 font-medium">{row.label}</td>
                                        <td className="px-6 py-3.5 text-right">{row.total_orders}</td>
                                        <td className="px-6 py-3.5 text-right font-semibold">{Number(row.total_sales).toLocaleString()}</td>
                                        <td className="px-6 py-3.5 text-right text-muted-foreground">
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