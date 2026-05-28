import { Head, Link, router, usePage, useForm } from '@inertiajs/react';
import { useState } from 'react';
import { Plus, Pencil, Trash2, Printer, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const TYPE_STYLES: Record<string, string> = {
    reseller: 'bg-purple-100 text-purple-800',
    normal:   'bg-gray-100 text-gray-700',
};

export default function CustomersIndex({ customers, filters }: any) {
    const { flash } = usePage().props as any;
    const [selected, setSelected]   = useState<number[]>([]);
    const [selectAll, setSelectAll] = useState(false);
    const { data, setData } = useForm({ search: filters?.search ?? '', type: filters?.type ?? '' });

    const pageIds    = customers.data.map((c: any) => c.id);
    const allPageSel = pageIds.length > 0 && pageIds.every((id: number) => selected.includes(id));
    const someSelected = selected.length > 0 || selectAll;

    function search(e: React.FormEvent) {
        e.preventDefault();
        router.get('/customers', data, { preserveState: true });
    }

    function toggleAll() {
        if (selectAll) {
            setSelectAll(false); setSelected([]);
        } else if (allPageSel) {
            setSelected([]);
        } else {
            setSelected(pageIds);
        }
    }

    function toggleOne(id: number) {
        setSelectAll(false);
        setSelected(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    }

    function destroy(id: number) {
        if (confirm('Delete this customer?')) router.delete(`/customers/${id}`);
    }

    function bulkDelete() {
        const label = selectAll ? `ALL ${customers.total} customers` : `${selected.length} selected customer(s)`;
        if (confirm(`Delete ${label}? This cannot be undone.`)) {
            if (selectAll) {
                router.delete('/customers/bulk-delete', {
                    data: { all: true },
                    onSuccess: () => { setSelected([]); setSelectAll(false); },
                });
            } else {
                router.delete('/customers/bulk-delete', {
                    data: { ids: selected },
                    onSuccess: () => { setSelected([]); setSelectAll(false); },
                });
            }
        }
    }

    return (
        <>
            <Head title="Customers" />
            <div className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold">Customers</h1>
                        <p className="text-sm text-muted-foreground mt-0.5">{customers.total} total customers</p>
                    </div>
                    <Link href="/customers/create">
                        <Button size="sm"><Plus className="size-4 mr-1" /> Add Customer</Button>
                    </Link>
                </div>

                {flash?.success && (
                    <div className="rounded-md bg-green-50 border border-green-200 px-4 py-2 text-sm text-green-800">{flash.success}</div>
                )}
                {flash?.error && (
                    <div className="rounded-md bg-red-50 border border-red-200 px-4 py-2 text-sm text-red-800">{flash.error}</div>
                )}

                {/* Search & filter */}
                <form onSubmit={search} className="flex gap-2 flex-wrap">
                    <Input
                        placeholder="Search by name, phone, address..."
                        value={data.search}
                        onChange={e => setData('search', e.target.value)}
                        className="max-w-xs"
                    />
                    <select
                        className="rounded-md border px-3 py-2 text-sm bg-background"
                        value={data.type}
                        onChange={e => setData('type', e.target.value)}
                    >
                        <option value="">All types</option>
                        <option value="normal">Normal</option>
                        <option value="reseller">Reseller</option>
                    </select>
                    <Button type="submit" variant="outline" size="sm"><Search className="size-4" /></Button>
                    {(data.search || data.type) && (
                        <Button type="button" variant="ghost" size="sm"
                            onClick={() => { setData({ search: '', type: '' }); router.get('/customers', {}, { preserveState: true }); }}>
                            Clear
                        </Button>
                    )}
                </form>

                {/* Bulk action bar */}
                {someSelected && (
                    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-2.5">
                        <span className="text-sm font-medium text-destructive">
                            {selectAll ? `All ${customers.total} customers selected` : `${selected.length} customer${selected.length > 1 ? 's' : ''} selected`}
                        </span>
                        {!selectAll && allPageSel && customers.total > customers.data.length && (
                            <button className="text-xs text-primary underline hover:no-underline" onClick={() => setSelectAll(true)}>
                                Select all {customers.total} customers across all pages
                            </button>
                        )}
                        {selectAll && (
                            <button className="text-xs text-muted-foreground underline hover:no-underline"
                                onClick={() => { setSelectAll(false); setSelected([]); }}>
                                Clear — select current page only
                            </button>
                        )}
                        <Button variant="destructive" size="sm" onClick={bulkDelete}>
                            <Trash2 className="size-4 mr-1" /> Delete {selectAll ? `All ${customers.total}` : selected.length}
                        </Button>
                        <button className="text-xs text-muted-foreground hover:text-foreground ml-auto"
                            onClick={() => { setSelected([]); setSelectAll(false); }}>
                            Clear selection
                        </button>
                    </div>
                )}

                <div className="rounded-2xl border overflow-hidden shadow-sm">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="text-xs text-muted-foreground uppercase tracking-wide border-b bg-muted/30">
                                <th className="px-4 py-3 w-10">
                                    <input type="checkbox" checked={selectAll || allPageSel} onChange={toggleAll}
                                        className="rounded border-gray-300 cursor-pointer" />
                                </th>
                                <th className="text-left px-4 py-3">Name</th>
                                <th className="text-left px-4 py-3">Phone</th>
                                <th className="text-left px-4 py-3">Area</th>
                                <th className="text-left px-4 py-3">Type</th>
                                <th className="text-left px-4 py-3">Promo</th>
                                <th className="px-4 py-3"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {customers.data.map((c: any, idx: number) => (
                                <tr key={c.id}
                                    className={`border-b last:border-0 transition-colors ${
                                        selectAll || selected.includes(c.id)
                                            ? 'bg-destructive/5'
                                            : idx % 2 === 0 ? 'hover:bg-muted/30' : 'bg-muted/10 hover:bg-muted/30'
                                    }`}>
                                    <td className="px-4 py-3">
                                        <input type="checkbox" checked={selectAll || selected.includes(c.id)}
                                            onChange={() => toggleOne(c.id)} className="rounded border-gray-300 cursor-pointer" />
                                    </td>
                                    <td className="px-4 py-3 font-medium">{c.name}</td>
                                    <td className="px-4 py-3 text-muted-foreground">{c.phone ?? '—'}</td>
                                    <td className="px-4 py-3 text-muted-foreground">{c.area?.name ?? '—'}</td>
                                    <td className="px-4 py-3">
                                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${TYPE_STYLES[c.type] ?? ''}`}>
                                            {c.type === 'reseller' ? 'Reseller' : 'Normal'}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3">
                                        {c.promo_type === 'reseller_promo' && (
                                            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                                                Reseller promo
                                            </span>
                                        )}
                                    </td>
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
                                <tr>
                                    <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                                        {data.search || data.type ? 'No customers match your search.' : 'No customers yet.'}
                                    </td>
                                </tr>
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