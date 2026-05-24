import { Head, useForm, router, usePage } from '@inertiajs/react';
import { Upload, Download, FileSpreadsheet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

export default function ImportExportIndex() {
    const { flash } = usePage().props as any;
    const { data, setData, post, processing, errors } = useForm({
        file: null as File | null,
    });

    function submit(e: React.FormEvent) {
        e.preventDefault();
        post('/import-export/preview', { forceFormData: true });
    }

    return (
        <>
            <Head title="Import / Export" />
            <div className="p-6 max-w-2xl space-y-6">
                <div>
                    <h1 className="text-2xl font-bold">Import / Export</h1>
                    <p className="text-sm text-muted-foreground mt-0.5">Upload existing Excel data or download orders as Excel.</p>
                </div>

                {flash?.error && (
                    <div className="rounded-md bg-red-50 border border-red-200 px-4 py-2 text-sm text-red-800">
                        {flash.error}
                    </div>
                )}

                {/* Export */}
                <div className="rounded-2xl border p-5 space-y-3">
                    <div className="flex items-center gap-2">
                        <Download className="size-5 text-green-600" />
                        <h2 className="font-semibold text-base">Export Orders</h2>
                    </div>
                    <p className="text-sm text-muted-foreground">
                        Download all orders as an Excel file in the same format as your <strong>PO CHN</strong> sheet.
                        Columns: KET, NO, NAMA, IG/WA, KOTA, KODE, WARNA, SIZE, HARGA SATUAN, DP, TGL DP, AN, KET.
                    </p>
                    <a href="/import-export/export">
                        <Button className="bg-green-600 hover:bg-green-700 w-full">
                            <Download className="size-4 mr-2" /> Download Excel (PO CHN format)
                        </Button>
                    </a>
                </div>

                {/* Import */}
                <div className="rounded-2xl border p-5 space-y-4">
                    <div className="flex items-center gap-2">
                        <Upload className="size-5 text-blue-600" />
                        <h2 className="font-semibold text-base">Import from Excel</h2>
                    </div>

                    <div className="rounded-lg border p-4 space-y-2 bg-muted/20 text-sm">
                        <p className="font-medium flex items-center gap-2">
                            <FileSpreadsheet className="size-4" /> Expected format
                        </p>
                        <div className="rounded border overflow-hidden">
                            <table className="w-full text-xs">
                                <thead className="bg-muted">
                                    <tr>
                                        {['KET','NO','NAMA','IG/WA','KOTA','KODE','WARNA','SIZE','HARGA SATUAN','DP','TGL DP','AN','KET'].map(h => (
                                            <th key={h} className="px-2 py-1 text-left font-medium">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr className="border-t text-muted-foreground">
                                        <td className="px-2 py-1">—</td>
                                        <td className="px-2 py-1">1</td>
                                        <td className="px-2 py-1">JASMINE</td>
                                        <td className="px-2 py-1">RESL</td>
                                        <td className="px-2 py-1">SURABAYA</td>
                                        <td className="px-2 py-1">NA_03</td>
                                        <td className="px-2 py-1">GREY</td>
                                        <td className="px-2 py-1">FZ</td>
                                        <td className="px-2 py-1">169000</td>
                                        <td className="px-2 py-1">500000</td>
                                        <td className="px-2 py-1">2026-05-03</td>
                                        <td className="px-2 py-1">JASMINE</td>
                                        <td className="px-2 py-1">—</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Sheet must be named <strong>PO CHN</strong>. Row 1 = title, Row 2 = headers, Row 3+ = data.
                            Customer name only needs to appear on the first row per group.
                        </p>
                    </div>

                    <form onSubmit={submit} className="space-y-3">
                        <div className="space-y-2">
                            <Label>Select Excel file (.xlsx)</Label>
                            <div
                                className="border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer hover:border-primary transition-colors"
                                onClick={() => document.getElementById('file-input')?.click()}
                            >
                                <Upload className="size-8 mx-auto text-muted-foreground mb-2" />
                                {data.file ? (
                                    <p className="text-sm font-medium text-primary">{(data.file as File).name}</p>
                                ) : (
                                    <p className="text-sm text-muted-foreground">Click to browse or drag & drop your .xlsx file</p>
                                )}
                            </div>
                            <input
                                id="file-input"
                                type="file"
                                accept=".xlsx,.xls"
                                className="hidden"
                                onChange={e => setData('file', e.target.files?.[0] ?? null)}
                            />
                            {errors.file && <p className="text-xs text-destructive">{errors.file}</p>}
                        </div>
                        <Button type="submit" disabled={processing || !data.file} className="w-full">
                            {processing ? 'Reading file...' : 'Preview Import →'}
                        </Button>
                    </form>
                </div>
            </div>
        </>
    );
}

ImportExportIndex.layout = (page: any) => page;