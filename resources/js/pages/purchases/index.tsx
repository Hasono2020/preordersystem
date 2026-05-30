import { Head, Link, router, usePage } from '@inertiajs/react';
import { Plus, Eye, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function PurchasesIndex({ purchases }: any) {
    const { flash } = usePage().props as any;

    function destroy(id: number) {
        if (confirm('Delete this purchase order?')) router.delete(`/purchases/${id}`);
    }

    return (
        <>
            <Head title="Purchase Orders" />
            <div className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold">Purchase Orders</h1>
                        <p className="text-sm text-muted-foreground mt-0.5">Record what you bought from suppliers.</p>
                    </div>
                    <Link href="/purchases/create">
                        <Button size="sm"><Plus className="size-4 mr-1" /> New Purchase</Button>
                    </Link>
                </div>

                {flash?.success && (
                    <div className="rounded-md bg-green-50 border border-green-200 px-4 py-2 text-sm text-green-800">
                        {flash.success}
                    </div>
                )}

                <div className="rounded-2xl border shadow-sm overflow-hidden">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="text-xs text-muted-foreground uppercase tracking-wide border-b bg-muted/30">
                                <th className="text-left px-6 py-3">Date</th>
                                <th className="text-left px-6 py-3">Supplier</th>
                                <th className="text-left px-6 py-3">Trip</th>
                                <th className="text-left px-6 py-3">Status</th>
                                <th className="text-right px-6 py-3">Items</th>
                                <th className="text-right px-6 py-3">Total Cost</th>
                                <th className="px-6 py-3"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {purchases.data.map((p: any, idx: number) => (
                                <tr key={p.id}
                                    className={`border-b last:border-0 hover:bg-muted/30 ${idx % 2 === 0 ? '' : 'bg-muted/10'}`}>
                                    <td className="px-6 py-3.5 text-muted-foreground">
                                        {new Date(p.purchase_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                                    </td>
                                    <td className="px-6 py-3.5 font-medium">{p.supplier_name ?? '—'}</td>
                                    <td className="px-6 py-3.5 text-muted-foreground">{p.trip?.name ?? '—'}</td>
                                    <td className="px-6 py-3.5">
                                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${p.status === 'confirmed' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                                            {p.status === 'confirmed' ? 'Confirmed' : 'Draft'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-3.5 text-right">{p.items_count}</td>
                                    <td className="px-6 py-3.5 text-right font-semibold">
                                        {Number(p.total_cost).toLocaleString()}
                                    </td>
                                    <td className="px-6 py-3.5 flex gap-2 justify-end">
                                        <Link href={`/purchases/${p.id}`}>
                                            <Button variant="ghost" size="icon"><Eye className="size-4" /></Button>
                                        </Link>
                                        <Link href={`/purchases/${p.id}/edit`}>
                                            <Button variant="ghost" size="icon"><Pencil className="size-4" /></Button>
                                        </Link>
                                        <Button variant="ghost" size="icon" onClick={() => destroy(p.id)}>
                                            <Trash2 className="size-4 text-destructive" />
                                        </Button>
                                    </td>
                                </tr>
                            ))}
                            {purchases.data.length === 0 && (
                                <tr><td colSpan={7} className="px-6 py-12 text-center text-muted-foreground">
                                    No purchase orders yet.
                                </td></tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                <div className="flex gap-2 justify-end text-sm">
                    {purchases.links.map((link: any, i: number) => (
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

PurchasesIndex.layout = (page: any) => page;