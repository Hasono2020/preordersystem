import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import { Plus, Eye, Pencil, Trash2, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const STATUS_COLORS: Record<string, string> = {
    bought:   'bg-green-100 text-green-800',
    keep:     'bg-yellow-100 text-yellow-800',
    sold_out: 'bg-red-100 text-red-800',
};

const STATUS_LABELS: Record<string, string> = {
    bought: 'Bought', keep: 'Keep', sold_out: 'Sold Out',
};

export default function OrdersIndex({ orders, filters }: any) {
    const { flash } = usePage().props as any;
    const { data, setData } = useForm({ search: filters.search ?? '', status: filters.status ?? '' });

    function search(e: React.FormEvent) {
        e.preventDefault();
        router.get('/orders', data, { preserveState: true });
    }

    function destroy(id: number) {
        if (confirm('Delete this order?')) router.delete(`/orders/${id}`);
    }

    return (
        <>
            <Head title="Orders" />
            <div className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                    <h1 className="text-xl font-semibold">Orders</h1>
                    <Link href="/orders/create">
                        <Button size="sm"><Plus className="size-4 mr-1" /> New Order</Button>
                    </Link>
                </div>

                {flash?.success && (
                    <div className="rounded-md bg-green-50 border border-green-200 px-4 py-2 text-sm text-green-800">
                        {flash.success}
                    </div>
                )}

                {/* Filters */}
                <form onSubmit={search} className="flex gap-2">
                    <Input
                        placeholder="Search by customer name..."
                        value={data.search}
                        onChange={e => setData('search', e.target.value)}
                        className="max-w-xs"
                    />
                    <select
                        className="rounded-md border px-3 py-2 text-sm bg-background"
                        value={data.status}
                        onChange={e => setData('status', e.target.value)}
                    >
                        <option value="">All statuses</option>
                        <option value="bought">Bought</option>
                        <option value="keep">Keep</option>
                        <option value="sold_out">Sold Out</option>
                    </select>
                    <Button type="submit" variant="outline" size="sm">
                        <Search className="size-4" />
                    </Button>
                </form>

                <div className="rounded-lg border overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-muted text-muted-foreground">
                            <tr>
                                <th className="text-left px-4 py-3">Date</th>
                                <th className="text-left px-4 py-3">Customer</th>
                                <th className="text-left px-4 py-3">Status</th>
                                <th className="text-left px-4 py-3">Courier</th>
                                <th className="text-right px-4 py-3">Total</th>
                                <th className="text-right px-4 py-3">Remaining</th>
                                <th className="px-4 py-3"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {orders.data.map((o: any) => (
                                <tr key={o.id} className="border-t hover:bg-muted/40">
                                    <td className="px-4 py-3 whitespace-nowrap">{o.order_date}</td>
                                    <td className="px-4 py-3 font-medium">{o.customer?.name}</td>
                                    <td className="px-4 py-3">
                                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[o.status]}`}>
                                            {STATUS_LABELS[o.status]}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-muted-foreground">{o.courier ?? '—'}</td>
                                    <td className="px-4 py-3 text-right">
                                        {Number(o.total_price).toLocaleString()}
                                    </td>
                                    <td className="px-4 py-3 text-right text-orange-600">
                                        {Number(o.remaining_payment) > 0 ? Number(o.remaining_payment).toLocaleString() : '—'}
                                    </td>
                                    <td className="px-4 py-3 flex gap-1 justify-end">
                                        <Link href={`/orders/${o.id}`}>
                                            <Button variant="ghost" size="icon"><Eye className="size-4" /></Button>
                                        </Link>
                                        <Link href={`/orders/${o.id}/edit`}>
                                            <Button variant="ghost" size="icon"><Pencil className="size-4" /></Button>
                                        </Link>
                                        <Button variant="ghost" size="icon" onClick={() => destroy(o.id)}>
                                            <Trash2 className="size-4 text-destructive" />
                                        </Button>
                                    </td>
                                </tr>
                            ))}
                            {orders.data.length === 0 && (
                                <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">No orders found.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="flex gap-2 justify-end text-sm">
                    {orders.links.map((link: any, i: number) => (
                        <Link key={i} href={link.url ?? '#'}
                            className={`px-3 py-1 rounded border ${link.active ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'} ${!link.url ? 'opacity-40 pointer-events-none' : ''}`}
                            dangerouslySetInnerHTML={{ __html: link.label }}
                        />
                    ))}
                </div>
            </div>
        </>
    );
}

OrdersIndex.layout = (page: any) => page;