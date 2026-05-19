import { Head, Link } from '@inertiajs/react';
import { ShoppingCart, Users, TrendingUp, Clock } from 'lucide-react';

export default function Dashboard({ stats }: any) {
    const cards = [
        {
            label: 'Total Orders',
            value: stats.total_orders,
            sub: 'All time',
            icon: ShoppingCart,
            color: 'text-blue-600',
            bg: 'bg-blue-50',
            href: '/orders',
        },
        {
            label: 'Total Customers',
            value: stats.total_customers,
            sub: 'Registered',
            icon: Users,
            color: 'text-purple-600',
            bg: 'bg-purple-50',
            href: '/customers',
        },
        {
            label: "This Month's Sales",
            value: Number(stats.this_month_sales).toLocaleString(),
            sub: new Date().toLocaleString('default', { month: 'long', year: 'numeric' }),
            icon: TrendingUp,
            color: 'text-green-600',
            bg: 'bg-green-50',
            href: '/reports',
        },
        {
            label: 'Pending Payments',
            value: Number(stats.pending_remaining).toLocaleString(),
            sub: 'Total remaining balance',
            icon: Clock,
            color: 'text-orange-600',
            bg: 'bg-orange-50',
            href: '/orders?status=bought',
        },
    ];

    return (
        <>
            <Head title="Dashboard" />
            <div className="p-6 space-y-6">
                <h1 className="text-xl font-semibold">Dashboard</h1>

                {/* Stat cards */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {cards.map((card) => (
                        <Link key={card.label} href={card.href}
                            className="rounded-xl border bg-card p-5 flex items-start gap-4 hover:shadow-sm transition-shadow">
                            <div className={`rounded-lg p-2 ${card.bg}`}>
                                <card.icon className={`size-5 ${card.color}`} />
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">{card.label}</p>
                                <p className="text-2xl font-semibold">{card.value}</p>
                                <p className="text-xs text-muted-foreground">{card.sub}</p>
                            </div>
                        </Link>
                    ))}
                </div>

                {/* Recent orders */}
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <h2 className="font-medium">Recent Orders</h2>
                        <Link href="/orders" className="text-sm text-muted-foreground hover:text-foreground">View all →</Link>
                    </div>
                    <div className="rounded-xl border overflow-hidden">
                        <table className="w-full text-sm">
                            <thead className="bg-muted text-muted-foreground">
                                <tr>
                                    <th className="text-left px-4 py-3">Date</th>
                                    <th className="text-left px-4 py-3">Customer</th>
                                    <th className="text-left px-4 py-3">Status</th>
                                    <th className="text-left px-4 py-3">Courier</th>
                                    <th className="text-right px-4 py-3">Total</th>
                                    <th className="text-right px-4 py-3">Remaining</th>
                                </tr>
                            </thead>
                            <tbody>
                                {stats.recent_orders.map((o: any) => (
                                    <tr key={o.id} className="border-t hover:bg-muted/40">
                                        <td className="px-4 py-3 text-muted-foreground">{o.order_date}</td>
                                        <td className="px-4 py-3 font-medium">{o.customer?.name}</td>
                                        <td className="px-4 py-3">
                                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                                o.status === 'bought'   ? 'bg-green-100 text-green-800' :
                                                o.status === 'keep'     ? 'bg-yellow-100 text-yellow-800' :
                                                'bg-red-100 text-red-800'
                                            }`}>
                                                {o.status === 'bought' ? 'Bought' : o.status === 'keep' ? 'Keep' : 'Sold Out'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-muted-foreground">{o.courier ?? '—'}</td>
                                        <td className="px-4 py-3 text-right">{Number(o.total_price).toLocaleString()}</td>
                                        <td className="px-4 py-3 text-right text-orange-600">
                                            {Number(o.remaining_payment) > 0 ? Number(o.remaining_payment).toLocaleString() : '—'}
                                        </td>
                                    </tr>
                                ))}
                                {stats.recent_orders.length === 0 && (
                                    <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">No orders yet.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </>
    );
}

Dashboard.layout = (page: any) => page;