import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import { Plus, Pencil, Trash2, Download, Upload, FileSpreadsheet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useRef } from 'react';

export default function ShippingAreasIndex({ areas }: any) {
    const { flash } = usePage().props as any;
    const fileRef   = useRef<HTMLInputElement>(null);
    const { data, setData, post, processing } = useForm({ file: null as File | null });

    function destroy(id: number) {
        if (confirm('Delete this shipping area?')) {
            router.delete(`/shipping-areas/${id}`);
        }
    }

    function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;
        setData('file', file);
        // Let useForm handle the file via forceFormData
        setTimeout(() => {
            post('/shipping-areas/import', { forceFormData: true });
        }, 50);
    }

    return (
        <>
            <Head title="Shipping Areas" />
            <div className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold">Shipping Areas</h1>
                        <p className="text-sm text-muted-foreground mt-0.5">
                            Manage delivery areas and shipping rates.
                        </p>
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
                {flash?.error && (
                    <div className="rounded-md bg-red-50 border border-red-200 px-4 py-2 text-sm text-red-800">
                        {flash.error}
                    </div>
                )}

                {/* Import / Export bar */}
                <div className="flex flex-wrap gap-2 rounded-xl border p-4 bg-muted/20">
                    <div className="flex items-center gap-2 mr-2">
                        <FileSpreadsheet className="size-4 text-muted-foreground" />
                        <span className="text-sm font-medium">Excel</span>
                    </div>

                    {/* Download template */}
                    <a href="/shipping-areas/template">
                        <Button variant="outline" size="sm">
                            <Download className="size-4 mr-1.5" /> Download Template
                        </Button>
                    </a>

                    {/* Export current data */}
                    <a href="/shipping-areas/export">
                        <Button variant="outline" size="sm">
                            <Download className="size-4 mr-1.5" /> Export Current Data
                        </Button>
                    </a>

                    {/* Import */}
                    <Button
                        variant="outline"
                        size="sm"
                        disabled={processing}
                        onClick={() => fileRef.current?.click()}
                    >
                        <Upload className="size-4 mr-1.5" />
                        {processing ? 'Importing...' : 'Import from Excel'}
                    </Button>
                    <input
                        ref={fileRef}
                        type="file"
                        accept=".xlsx,.xls"
                        className="hidden"
                        onChange={handleImport}
                    />

                    <p className="w-full text-xs text-muted-foreground mt-1">
                        Import will <strong>update</strong> existing areas by name and <strong>create</strong> new ones.
                        Download the template to see the correct format.
                    </p>
                </div>

                {/* Table */}
                <div className="rounded-2xl border shadow-sm overflow-hidden">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="text-xs text-muted-foreground uppercase tracking-wide border-b bg-muted/30">
                                <th className="text-left px-6 py-3">Area Name</th>
                                <th className="text-right px-6 py-3">Price / kg</th>
                                <th className="px-6 py-3"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {areas.map((area: any, idx: number) => (
                                <tr key={area.id}
                                    className={`border-b last:border-0 hover:bg-muted/30 transition-colors ${idx % 2 === 0 ? '' : 'bg-muted/10'}`}>
                                    <td className="px-6 py-3.5 font-medium">{area.name}</td>
                                    <td className="px-6 py-3.5 text-right">
                                        {Number(area.price_per_kg).toLocaleString()}
                                    </td>
                                    <td className="px-6 py-3.5 flex gap-2 justify-end">
                                        <Link href={`/shipping-areas/${area.id}/edit`}>
                                            <Button variant="ghost" size="icon">
                                                <Pencil className="size-4" />
                                            </Button>
                                        </Link>
                                        <Button variant="ghost" size="icon" onClick={() => destroy(area.id)}>
                                            <Trash2 className="size-4 text-destructive" />
                                        </Button>
                                    </td>
                                </tr>
                            ))}
                            {areas.length === 0 && (
                                <tr>
                                    <td colSpan={3} className="px-6 py-12 text-center text-muted-foreground">
                                        No shipping areas yet.{' '}
                                        <Link href="/shipping-areas/create" className="text-primary hover:underline">
                                            Add one →
                                        </Link>
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