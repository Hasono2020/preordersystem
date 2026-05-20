import { Head, Link, usePage } from '@inertiajs/react';
import { ShoppingCart, Users, TrendingUp, Clock, ArrowUpRight } from 'lucide-react';

const STATUS_COLORS: Record<string, string> = {
    bought:   'bg-emerald-500',
    keep:     'bg-amber-500',
    sold_out: 'bg-rose-500',
};
const STATUS_LABELS: Record<string, string> = {
    bought: 'Bought', keep: 'Keep', sold_out: 'Sold Out',
};

export default function Dashboard({ stats }: any) {
    const { auth } = usePage().props as any;
    const isAdmin = auth.user?.role === 'admin';
    const cards = [
        {
            label: 'Total Orders',
            value: stats.total_orders,
            sub: 'All time',
            icon: ShoppingCart,
            gradient: 'from-orange-400 to-orange-500',
            href: '/orders',
        },
        {
            label: 'Total Customers',
            value: stats.total_customers,
            sub: 'Registered',
            icon: Users,
            gradient: 'from-green-400 to-green-500',
            href: '/customers',
        },
        {
            label: "This Month's Sales",
            value: Number(stats.this_month_sales).toLocaleString(),
            sub: new Date().toLocaleString('default', { month: 'long', year: 'numeric' }),
            icon: TrendingUp,
            gradient: 'from-sky-400 to-sky-500',
            href: isAdmin ? '/reports' : '/orders',  // 👈 redirect staff to orders instead
        },
        {
            label: 'Pending Payments',
            value: Number(stats.pending_remaining).toLocaleString(),
            sub: 'Total remaining balance',
            icon: Clock,
            gradient: 'from-rose-400 to-rose-500',
            href: '/orders',
        },
    ];

    return (
        <>
            <Head title="Dashboard" />
            <div className="p-6 space-y-6">

                {/* Header */}
                <div>
                    <h1 className="text-2xl font-bold">Dashboard</h1>
                    <p className="text-sm text-muted-foreground mt-0.5">
                        Welcome back! Here's what's happening today.
                    </p>
                </div>

                {/* Stat cards */}
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
                    {cards.map((card) => (
                        <Link key={card.label} href={card.href}
                            className="group rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                            <div className={`bg-linear-to-br ${card.gradient} p-5 text-white`}>
                                <div className="flex items-start justify-between">
                                    <div className="rounded-xl bg-white/20 p-2.5">
                                        <card.icon className="size-5 text-white" />
                                    </div>
                                    <ArrowUpRight className="size-4 text-white/70 group-hover:text-white transition-colors" />
                                </div>
                                <div className="mt-4">
                                    <p className="text-3xl font-bold">{card.value}</p>
                                    <p className="text-sm font-medium text-white/90 mt-0.5">{card.label}</p>
                                    <p className="text-xs text-white/70 mt-0.5">{card.sub}</p>
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>

                {/* Recent orders */}
                <div className="rounded-2xl border shadow-sm overflow-hidden">
                    <div className="flex items-center justify-between px-6 py-4 border-b bg-muted/30">
                        <div>
                            <h2 className="font-semibold text-base">Recent Orders</h2>
                            <p className="text-xs text-muted-foreground">Latest 8 orders recorded</p>
                        </div>
                        <Link href="/orders"
                            className="text-xs font-medium text-primary hover:underline flex items-center gap-1">
                            View all <ArrowUpRight className="size-3" />
                        </Link>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-xs text-muted-foreground uppercase tracking-wide border-b">
                                    <th className="text-left px-6 py-3">Date</th>
                                    <th className="text-left px-6 py-3">Customer</th>
                                    <th className="text-left px-6 py-3">Status</th>
                                    <th className="text-left px-6 py-3">Courier</th>
                                    <th className="text-right px-6 py-3">Total</th>
                                    <th className="text-right px-6 py-3">Remaining</th>
                                </tr>
                            </thead>
                            <tbody>
                                {stats.recent_orders.map((o: any, idx: number) => (
                                    <tr key={o.id}
                                        className={`border-b last:border-0 hover:bg-muted/30 transition-colors ${idx % 2 === 0 ? '' : 'bg-muted/10'}`}>
                                        <td className="px-6 py-3.5 text-muted-foreground whitespace-nowrap">
                                            {new Date(o.order_date).toLocaleDateString('en-GB', {
                                                day: '2-digit', month: 'short', year: 'numeric'
                                            })}
                                        </td>
                                        <td className="px-6 py-3.5 font-medium">{o.customer?.name}</td>
                                        <td className="px-6 py-3.5">
                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium text-white ${STATUS_COLORS[o.status]}`}>
                                                <span className="size-1.5 rounded-full bg-white/80 inline-block" />
                                                {STATUS_LABELS[o.status]}
                                            </span>
                                        </td>
                                        <td className="px-6 py-3.5 text-muted-foreground">{o.courier ?? '—'}</td>
                                        <td className="px-6 py-3.5 text-right font-medium">
                                            {Number(o.total_price).toLocaleString()}
                                        </td>
                                        <td className="px-6 py-3.5 text-right font-semibold text-rose-500">
                                            {Number(o.remaining_payment) > 0
                                                ? Number(o.remaining_payment).toLocaleString()
                                                : <span className="text-emerald-500 font-medium">Paid</span>}
                                        </td>
                                    </tr>
                                ))}
                                {stats.recent_orders.length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">
                                            No orders yet. <Link href="/orders/create" className="text-primary hover:underline">Create your first order →</Link>
                                        </td>
                                    </tr>
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