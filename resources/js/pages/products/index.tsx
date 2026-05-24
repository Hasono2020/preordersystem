import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import { Plus, Pencil, Trash2, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function ProductsIndex({ products, filters }: any) {
    const { flash } = usePage().props as any;
    const { data, setData } = useForm({ search: filters.search ?? '' });

    function search(e: React.FormEvent) {
        e.preventDefault();
        router.get('/products', data, { preserveState: true });
    }

    function destroy(id: number) {
        if (confirm('Delete this product?')) router.delete(`/products/${id}`);
    }

    return (
        <>
            <Head title="Products" />
            <div className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold">Products</h1>
                        <p className="text-sm text-muted-foreground mt-0.5">Manage your product catalog.</p>
                    </div>
                    <Link href="/products/create">
                        <Button size="sm"><Plus className="size-4 mr-1" /> Add Product</Button>
                    </Link>
                </div>

                {flash?.success && (
                    <div className="rounded-md bg-green-50 border border-green-200 px-4 py-2 text-sm text-green-800">
                        {flash.success}
                    </div>
                )}

                <form onSubmit={search} className="flex gap-2">
                    <Input
                        placeholder="Search by code or name..."
                        value={data.search}
                        onChange={e => setData('search', e.target.value)}
                        className="max-w-xs"
                    />
                    <Button type="submit" variant="outline" size="sm">
                        <Search className="size-4" />
                    </Button>
                </form>

                <div className="rounded-2xl border shadow-sm overflow-hidden">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="text-xs text-muted-foreground uppercase tracking-wide border-b bg-muted/30">
                                <th className="text-left px-6 py-3">Code</th>
                                <th className="text-left px-6 py-3">Name</th>
                                <th className="text-right px-6 py-3">Price</th>
                                <th className="text-right px-6 py-3">Weight (g)</th>
                                <th className="text-right px-6 py-3">Stock</th>
                                <th className="text-left px-6 py-3">Colors</th>
                                <th className="text-left px-6 py-3">Sizes</th>
                                <th className="px-6 py-3"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {products.data.map((p: any, idx: number) => (
                                <tr key={p.id}
                                    className={`border-b last:border-0 hover:bg-muted/30 transition-colors ${idx % 2 === 0 ? '' : 'bg-muted/10'}`}>
                                    <td className="px-6 py-3.5 font-mono font-medium text-xs">{p.code}</td>
                                    <td className="px-6 py-3.5 font-medium">{p.name}</td>
                                    <td className="px-6 py-3.5 text-right">{Number(p.price).toLocaleString()}</td>
                                    <td className="px-6 py-3.5 text-right text-muted-foreground">{p.weight}g</td>
                                    <td className="px-6 py-3.5 text-right">
                                        {p.quantity <= 0 ? (
                                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
                                                Out of stock
                                            </span>
                                        ) : (
                                            <span className={`font-semibold ${
                                                p.quantity < 10 ? 'text-amber-500' : 'text-green-600'
                                            }`}>
                                                {p.quantity}
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-6 py-3.5">
                                        <div className="flex flex-wrap gap-1">
                                            {(p.colors ?? []).slice(0, 4).map((c: string) => (
                                                <span key={c} className="px-1.5 py-0.5 rounded text-xs bg-muted">{c}</span>
                                            ))}
                                            {(p.colors ?? []).length > 4 && (
                                                <span className="px-1.5 py-0.5 rounded text-xs bg-muted text-muted-foreground">
                                                    +{p.colors.length - 4}
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-3.5">
                                        <div className="flex flex-wrap gap-1">
                                            {(p.sizes ?? []).map((s: string) => (
                                                <span key={s} className="px-1.5 py-0.5 rounded text-xs border font-medium">{s}</span>
                                            ))}
                                        </div>
                                    </td>
                                    <td className="px-6 py-3.5 flex gap-2 justify-end">
                                        <Link href={`/products/${p.id}/edit`}>
                                            <Button variant="ghost" size="icon"><Pencil className="size-4" /></Button>
                                        </Link>
                                        <Button variant="ghost" size="icon" onClick={() => destroy(p.id)}>
                                            <Trash2 className="size-4 text-destructive" />
                                        </Button>
                                    </td>
                                </tr>
                            ))}
                            {products.data.length === 0 && (
                                <tr>
                                    <td colSpan={8} className="px-6 py-12 text-center text-muted-foreground">
                                        No products yet. <Link href="/products/create" className="text-primary hover:underline">Add one →</Link>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                <div className="flex gap-2 justify-end text-sm">
                    {products.links.map((link: any, i: number) => (
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

ProductsIndex.layout = (page: any) => page;