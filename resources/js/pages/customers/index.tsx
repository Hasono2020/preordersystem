import { Head, Link, router, usePage } from '@inertiajs/react';
import { Plus, Pencil, Trash2, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function CustomersIndex({ customers }: any) {
    const { flash } = usePage().props as any;

    function destroy(id: number) {
        if (confirm('Delete this customer?')) {
            router.delete(`/customers/${id}`);
        }
    }

    return (
        <>
            <Head title="Customers" />
            <div className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                    <h1 className="text-xl font-semibold">Customers</h1>
                    <Link href="/customers/create">
                        <Button size="sm"><Plus className="size-4 mr-1" /> Add Customer</Button>
                    </Link>
                </div>

                {flash?.success && (
                    <div className="rounded-md bg-green-50 border border-green-200 px-4 py-2 text-sm text-green-800">
                        {flash.success}
                    </div>
                )}

                <div className="rounded-lg border overflow-hidden">
                    <table className="w-full text-sm">
                        <thead className="bg-muted text-muted-foreground">
                            <tr>
                                <th className="text-left px-4 py-3">Name</th>
                                <th className="text-left px-4 py-3">Phone</th>
                                <th className="text-left px-4 py-3">Address</th>
                                <th className="px-4 py-3"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {customers.data.map((c: any) => (
                                <tr key={c.id} className="border-t hover:bg-muted/40">
                                    <td className="px-4 py-3 font-medium">{c.name}</td>
                                    <td className="px-4 py-3 text-muted-foreground">{c.phone ?? '—'}</td>
                                    <td className="px-4 py-3 text-muted-foreground">{c.address ?? '—'}</td>
                                    <td className="px-4 py-3 flex gap-2 justify-end">
                                        <button onClick={() => window.open(`/customers/${c.id}/print`, '_blank')}
                                            className="inline-flex items-center justify-center rounded-md h-9 w-9 hover:bg-accent hover:text-accent-foreground">
                                            <Printer className="size-4 text-blue-500" />
                                        </button>
                                        <Link href={`/customers/${c.id}/edit`}>
                                            <Button variant="ghost" size="icon"><Pencil className="size-4" /></Button>
                                        </Link>
                                        <Button variant="ghost" size="icon" onClick={() => destroy(c.id)}>
                                            <Trash2 className="size-4 text-destructive" />
                                        </Button>
                                    </td>
                                </tr>
                            ))}
                            {customers.data.length === 0 && (
                                <tr><td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">No customers yet.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                <div className="flex gap-2 justify-end text-sm">
                    {customers.links.map((link: any, i: number) => (
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

CustomersIndex.layout = (page: any) => page;