import { useEffect } from 'react';
import { Head, useForm, Link, router } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Trash2 } from 'lucide-react';

// ── Types ────────────────────────────────────────────────────────────────────
interface Trip        { id: number; name: string; location?: string; destination?: string; start_date?: string; end_date?: string; status: string }
interface Customer    { id: number; name: string; phone?: string }
interface Order       { id: number; customer?: Customer; order_date: string; status: string; total_price: number; remaining_payment: number; items: OrderItem[] }
interface OrderItem   { id: number; product_name: string; color?: string; size?: string; quantity: number; price: number; total_price: number; status?: string }
interface Payment     { id: number; amount: number; paid_at: string; note?: string }
interface Allocation  { order_id: number; customer_name: string; order_date: string; qty_requested: number; qty_allocated: number; will_get: boolean; fully_filled: boolean }
interface AllocRow    { po_item_id: number; product_name: string; color: string; size: string; qty_needed: number; qty_available: number; qty_shortfall: number; has_shortfall: boolean; allocations: Allocation[] }
interface PurchItem   { product_id: number | null; product_name: string; color: string; size: string; qty_ordered: number; qty_received: number; cost_price: number; total_cost: number }
interface Customer2   { name: string; quantity: number; order_id: number }
interface SummaryRow  { product_name: string; color: string; size: string; total_qty: number; customers: Customer2[] }
interface StatItem    { label: string; value: string | number; color: string }
// ─────────────────────────────────────────────────────────────────────────────


function noScroll(e: React.WheelEvent<HTMLInputElement>) {
    (e.target as HTMLInputElement).blur();
}

const emptyItem = { product_id: null, product_name: '', color: '', size: '', qty_ordered: 0, qty_received: 0, cost_price: 0, total_cost: 0 };

export default function PurchaseCreate({ trips, suggested, tripId }: { trips: Trip[]; suggested: PurchItem[]; tripId?: string }) {
    const { data, setData, post, processing, errors } = useForm({
        trip_id:       tripId ?? '',
        supplier_name: '',
        purchase_date: new Date().toISOString().slice(0, 10),
        status:        'draft',
        notes:         '',
        items:         suggested?.length > 0 ? suggested : [{ ...emptyItem }],
    });

    function addItem() {
        setData('items', [...data.items, { ...emptyItem }]);
    }

    function removeItem(i: number) {
        setData('items', data.items.filter((_: PurchItem, idx: number) => idx !== i));
    }

    function updateItem(i: number, field: keyof PurchItem, value: unknown) {
        const items   = [...data.items];
        items[i]      = { ...items[i], [field]: value };
        // Auto calculate total cost
        if (field === 'qty_received' || field === 'cost_price') {
            const qty   = field === 'qty_received' ? Number(value) : Number(items[i].qty_received);
            const price = field === 'cost_price'   ? Number(value) : Number(items[i].cost_price);
            items[i].total_cost = qty * price;
        }
        setData('items', items);
    }

    // When trip changes, offer to load suggested items
    function handleTripChange(tripId: string) {
        setData('trip_id', tripId);
        if (tripId) {
            router.get('/purchases/create', { trip_id: tripId }, { preserveState: false });
        }
    }

    const totalCost = data.items.reduce((sum: number, i: PurchItem) =>
        sum + (Number(i.qty_received) * Number(i.cost_price)), 0);

    function submit(e: React.FormEvent) {
        e.preventDefault();
        post('/purchases');
    }

    return (
        <>
            <Head title="New Purchase Order" />
            <div className="p-6 max-w-4xl space-y-6">
                <div className="flex items-center gap-3">
                    <Link href="/purchases" className="text-muted-foreground hover:text-foreground text-sm">← Back</Link>
                    <h1 className="text-xl font-semibold">New Purchase Order</h1>
                </div>

                <form onSubmit={submit} className="space-y-6">
                    {/* Header info */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <Label>Trip</Label>
                            <select className="w-full rounded-md border px-3 py-2 text-sm bg-background"
                                value={data.trip_id}
                                onChange={e => handleTripChange(e.target.value)}>
                                <option value="">— No trip —</option>
                                {trips.map((t: Trip) => (
                                    <option key={t.id} value={t.id}>{t.name} {t.location ? `(${t.location})` : ''}</option>
                                ))}
                            </select>
                        </div>
                        <div className="space-y-1">
                            <Label>Supplier Name</Label>
                            <Input value={data.supplier_name} onChange={e => setData('supplier_name', e.target.value)} placeholder="e.g. Guangzhou Supplier A" />
                        </div>
                        <div className="space-y-1">
                            <Label>Purchase Date *</Label>
                            <Input type="date" value={data.purchase_date} onChange={e => setData('purchase_date', e.target.value)} />
                        </div>
                        <div className="space-y-1">
                            <Label>Status</Label>
                            <select className="w-full rounded-md border px-3 py-2 text-sm bg-background"
                                value={data.status} onChange={e => setData('status', e.target.value)}>
                                <option value="draft">Draft</option>
                                <option value="confirmed">Confirmed</option>
                            </select>
                        </div>
                    </div>

                    {/* Items */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <div>
                                <Label className="text-base">Items</Label>
                                {suggested?.length > 0 && (
                                    <p className="text-xs text-muted-foreground mt-0.5">
                                        ✅ Pre-filled from {suggested.length} keep order variants for this trip
                                    </p>
                                )}
                            </div>
                            <Button type="button" variant="outline" size="sm" onClick={addItem}>
                                <Plus className="size-4 mr-1" /> Add Item
                            </Button>
                        </div>

                        <div className="rounded-lg border overflow-hidden">
                            <table className="w-full text-sm table-fixed">
                                <colgroup>
                                    <col style={{width:'22%'}} />
                                    <col style={{width:'12%'}} />
                                    <col style={{width:'10%'}} />
                                    <col style={{width:'12%'}} />
                                    <col style={{width:'12%'}} />
                                    <col style={{width:'14%'}} />
                                    <col style={{width:'14%'}} />
                                    <col style={{width:'4%'}} />
                                </colgroup>
                                <thead className="bg-muted text-muted-foreground">
                                    <tr>
                                        <th className="text-left px-3 py-2">Product</th>
                                        <th className="text-left px-3 py-2">Color</th>
                                        <th className="text-left px-3 py-2">Size</th>
                                        <th className="text-right px-3 py-2">Qty Needed</th>
                                        <th className="text-right px-3 py-2">Qty Got</th>
                                        <th className="text-right px-3 py-2">Cost/unit</th>
                                        <th className="text-right px-3 py-2">Total</th>
                                        <th className="px-3 py-2"></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.items.map((item: PurchItem, i: number) => (
                                        <tr key={i} className={`border-t ${Number(item.qty_received) < Number(item.qty_ordered) && item.qty_ordered > 0 ? 'bg-amber-50/50' : ''}`}>
                                            <td className="px-2 py-2">
                                                <Input value={item.product_name}
                                                    onChange={e => updateItem(i, 'product_name', e.target.value)}
                                                    placeholder="Product code" />
                                            </td>
                                            <td className="px-2 py-2">
                                                <Input value={item.color}
                                                    onChange={e => updateItem(i, 'color', e.target.value)}
                                                    placeholder="Color" />
                                            </td>
                                            <td className="px-2 py-2">
                                                <Input value={item.size}
                                                    onChange={e => updateItem(i, 'size', e.target.value)}
                                                    placeholder="Size" />
                                            </td>
                                            <td className="px-2 py-2">
                                                <Input type="number" min="0" onWheel={noScroll}
                                                    value={item.qty_ordered || ''}
                                                    onChange={e => updateItem(i, 'qty_ordered', parseInt(e.target.value) || 0)}
                                                    className="text-right" />
                                            </td>
                                            <td className="px-2 py-2">
                                                <Input type="number" min="0" onWheel={noScroll}
                                                    value={item.qty_received || ''}
                                                    onChange={e => updateItem(i, 'qty_received', parseInt(e.target.value) || 0)}
                                                    className={`text-right ${Number(item.qty_received) < Number(item.qty_ordered) && item.qty_ordered > 0 ? 'border-amber-400' : ''}`} />
                                                {Number(item.qty_received) < Number(item.qty_ordered) && item.qty_ordered > 0 && (
                                                    <p className="text-xs text-amber-600 mt-0.5 text-right">
                                                        {Number(item.qty_ordered) - Number(item.qty_received)} short
                                                    </p>
                                                )}
                                            </td>
                                            <td className="px-2 py-2">
                                                <Input type="number" min="0" onWheel={noScroll}
                                                    value={item.cost_price || ''}
                                                    onChange={e => updateItem(i, 'cost_price', parseFloat(e.target.value) || 0)}
                                                    className="text-right" />
                                            </td>
                                            <td className="px-3 py-2 text-right font-medium">
                                                {(Number(item.qty_received) * Number(item.cost_price)).toLocaleString()}
                                            </td>
                                            <td className="px-2 py-2">
                                                {data.items.length > 1 && (
                                                    <Button type="button" variant="ghost" size="icon" onClick={() => removeItem(i)}>
                                                        <Trash2 className="size-4 text-destructive" />
                                                    </Button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Total cost */}
                        <div className="flex justify-end">
                            <div className="rounded-xl border px-6 py-3 bg-muted/30 text-sm space-y-1">
                                <div className="flex justify-between gap-8 font-semibold">
                                    <span>Total Cost</span>
                                    <span>{totalCost.toLocaleString()}</span>
                                </div>
                                {data.items.some((i: PurchItem) => Number(i.qty_received) < Number(i.qty_ordered) && i.qty_ordered > 0) && (
                                    <p className="text-xs text-amber-600">
                                        ⚠ Some items received less than ordered
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="space-y-1">
                        <Label>Notes</Label>
                        <textarea className="w-full rounded-md border px-3 py-2 text-sm bg-background" rows={2}
                            value={data.notes} onChange={e => setData('notes', e.target.value)} />
                    </div>

                    <Button type="submit" disabled={processing}>Save Purchase Order</Button>
                </form>
            </div>
        </>
    );
}

PurchaseCreate.layout = (page: React.ReactNode) => page;