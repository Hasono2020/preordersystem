import { Head, router } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { CheckCircle, AlertCircle } from 'lucide-react';

export default function ImportPreview({ preview, totalRows }: any) {
    function handleConfirm() {
        router.post('/import-export/confirm');
    }

    return (
        <>
            <Head title="Preview Import" />
            <div className="p-6 space-y-6">
                <div>
                    <h1 className="text-2xl font-bold">Preview Import</h1>
                    <p className="text-sm text-muted-foreground mt-0.5">Review data before importing.</p>
                </div>

                <div className="flex items-center gap-3 rounded-2xl border p-4 bg-green-50 border-green-200">
                    <CheckCircle className="size-5 text-green-600 shrink-0" />
                    <div>
                        <p className="font-semibold text-green-800">Ready to import {totalRows} item rows</p>
                        <p className="text-sm text-green-700">Rows grouped by customer name + date into orders. New customers created automatically.</p>
                    </div>
                </div>

                {totalRows > 50 && (
                    <div className="flex items-center gap-3 rounded-2xl border p-4 bg-amber-50 border-amber-200">
                        <AlertCircle className="size-5 text-amber-600 shrink-0" />
                        <p className="text-sm text-amber-700">Showing first 50 rows. All {totalRows} rows will be imported.</p>
                    </div>
                )}

                <div className="rounded-2xl border overflow-x-auto shadow-sm">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="text-xs text-muted-foreground uppercase tracking-wide border-b bg-muted/30">
                                <th className="text-left px-4 py-3">Name</th>
                                <th className="text-left px-4 py-3">Phone</th>
                                <th className="text-left px-4 py-3">Area</th>
                                <th className="text-left px-4 py-3">Code</th>
                                <th className="text-left px-4 py-3">Color</th>
                                <th className="text-left px-4 py-3">Size</th>
                                <th className="text-right px-4 py-3">Price</th>
                                <th className="text-right px-4 py-3">DP</th>
                                <th className="text-left px-4 py-3">Date of DP</th>
                                <th className="text-left px-4 py-3">AN</th>
                                <th className="text-left px-4 py-3">Notes</th>
                            </tr>
                        </thead>
                        <tbody>
                            {preview.map((row: any, i: number) => (
                                <tr key={i} className={`border-b last:border-0 hover:bg-muted/30 ${i % 2 === 0 ? '' : 'bg-muted/10'}`}>
                                    <td className="px-4 py-2.5 font-medium">{row.name}</td>
                                    <td className="px-4 py-2.5 text-muted-foreground">{row.phone || '—'}</td>
                                    <td className="px-4 py-2.5 text-muted-foreground">{row.area || '—'}</td>
                                    <td className="px-4 py-2.5 font-mono text-xs font-semibold">{row.product_code}</td>
                                    <td className="px-4 py-2.5 text-muted-foreground">{row.color || '—'}</td>
                                    <td className="px-4 py-2.5 text-muted-foreground">{row.size || '—'}</td>
                                    <td className="px-4 py-2.5 text-right">{Number(row.price).toLocaleString()}</td>
                                    <td className="px-4 py-2.5 text-right">{row.down_payment > 0 ? Number(row.down_payment).toLocaleString() : '—'}</td>
                                    <td className="px-4 py-2.5 text-muted-foreground">{row.order_date || '—'}</td>
                                    <td className="px-4 py-2.5 text-muted-foreground">{row.an || '—'}</td>
                                    <td className="px-4 py-2.5 text-muted-foreground">{row.notes || '—'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="flex gap-3">
                    <Button onClick={handleConfirm} className="bg-green-600 hover:bg-green-700">
                        ✓ Confirm & Import {totalRows} rows
                    </Button>
                    <Button variant="outline" onClick={() => router.visit('/import-export')}>
                        ← Cancel
                    </Button>
                </div>
            </div>
        </>
    );
}

ImportPreview.layout = (page: any) => page;