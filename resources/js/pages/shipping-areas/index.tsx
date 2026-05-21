import { Head, Link, router, usePage } from '@inertiajs/react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function ShippingAreasIndex({ areas }: any) {
    const { flash } = usePage().props as any;

    function destroy(id: number) {
        if (confirm('Delete this shipping area?')) {
            router.delete(`/shipping-areas/${id}`);
        }
    }

    return (
        <>
            <Head title="Shipping Areas" />
            <div className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold">Shipping Areas</h1>
                        <p className="text-sm text-muted-foreground mt-0.5">Manage delivery areas and shipping rates.</p>
                    </div>
                    <Link href="/shipping-areas/create">
                        <Button size="sm"><Plus className="size-4 mr-1" /> Add Area</Button>
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
                                <th className="text-left px-6 py-3">Area Name</th>
                                <th className="text-right px-6 py-3">Flat Shipping Price</th>
                                <th className="text-right px-6 py-3">Price / kg</th>
                                <th className="px-6 py-3"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {areas.map((area: any, idx: number) => (
                                <tr key={area.id}
                                    className={`border-b last:border-0 hover:bg-muted/30 transition-colors ${idx % 2 === 0 ? '' : 'bg-muted/10'}`}>
                                    <td className="px-6 py-3.5 font-medium">{area.name}</td>
                                    <td className="px-6 py-3.5 text-right">{Number(area.flat_price).toLocaleString()}</td>
                                    <td className="px-6 py-3.5 text-right">{Number(area.price_per_kg).toLocaleString()}</td>
                                    <td className="px-6 py-3.5 flex gap-2 justify-end">
                                        <Link href={`/shipping-areas/${area.id}/edit`}>
                                            <Button variant="ghost" size="icon"><Pencil className="size-4" /></Button>
                                        </Link>
                                        <Button variant="ghost" size="icon" onClick={() => destroy(area.id)}>
                                            <Trash2 className="size-4 text-destructive" />
                                        </Button>
                                    </td>
                                </tr>
                            ))}
                            {areas.length === 0 && (
                                <tr>
                                    <td colSpan={4} className="px-6 py-12 text-center text-muted-foreground">
                                        No shipping areas yet. <Link href="/shipping-areas/create" className="text-primary hover:underline">Add one →</Link>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </>
    );
}

ShippingAreasIndex.layout = (page: any) => page;