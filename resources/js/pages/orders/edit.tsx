import { useEffect } from 'react';
import { Head, useForm, Link } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Trash2 } from 'lucide-react';

const emptyItem = { product_name: '', color: '', size: '', quantity: 1, price: 0 };

export default function OrderEdit({ order, customers }: any) {
    const { data, setData, patch, processing, errors } = useForm({
        customer_id:         String(order.customer_id),
        order_date:          order.order_date,
        status:              order.status,
        discount:            Number(order.discount),
        shipping_fee:        Number(order.shipping_fee),
        shipping_fee_per_kg: Number(order.shipping_fee_per_kg),
        total_shipping_fee:  Number(order.total_shipping_fee),
        down_payment:        Number(order.down_payment),
        courier:             order.courier ?? '',
        notes:               order.notes ?? '',
        items:               order.items.map((i: any) => ({
            product_name: i.product_name,
            color:        i.color ?? '',
            size:         i.size ?? '',
            quantity:     i.quantity,
            price:        Number(i.price),
        })),
    });

    // Auto-calculate total shipping fee
    useEffect(() => {
        const total = Number(data.shipping_fee) * Number(data.shipping_fee_per_kg);
        setData('total_shipping_fee', total);
    }, [data.shipping_fee, data.shipping_fee_per_kg]);

    function addItem() {
        setData('items', [...data.items, { ...emptyItem }]);
    }

    function removeItem(i: number) {
        setData('items', data.items.filter((_: any, idx: number) => idx !== i));
    }

    function updateItem(i: number, field: string, value: any) {
        const items = [...data.items];
        items[i] = { ...items[i], [field]: value };
        setData('items', items);
    }

    const itemsTotal = data.items.reduce((sum: number, i: any) => sum + (Number(i.quantity) * Number(i.price)), 0);
    const grandTotal = itemsTotal - Number(data.discount) + Number(data.total_shipping_fee);
    const remaining  = grandTotal - Number(data.down_payment);

    function submit(e: React.FormEvent) {
        e.preventDefault();
        patch(`/orders/${order.id}`);
    }

    return (
        <>
            <Head title={`Edit Order #${order.id}`} />
            <div className="p-6 max-w-3xl space-y-6">
                <div className="flex items-center gap-3">
                    <Link href={`/orders/${order.id}`} className="text-muted-foreground hover:text-foreground text-sm">← Back</Link>
                    <h1 className="text-xl font-semibold">Edit Order #{order.id}</h1>
                </div>

                <form onSubmit={submit} className="space-y-6">
                    {/* Basic info */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <Label>Customer *</Label>
                            <select
                                className="w-full rounded-md border px-3 py-2 text-sm bg-background"
                                value={data.customer_id}
                                onChange={e => setData('customer_id', e.target.value)}
                            >
                                <option value="">Select customer...</option>
                                {customers.map((c: any) => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </select>
                            {errors.customer_id && <p className="text-xs text-destructive">{errors.customer_id}</p>}
                        </div>
                        <div className="space-y-1">
                            <Label>Order date *</Label>
                            <Input type="date" value={data.order_date} onChange={e => setData('order_date', e.target.value)} />
                        </div>
                        <div className="space-y-1">
                            <Label>Status *</Label>
                            <select
                                className="w-full rounded-md border px-3 py-2 text-sm bg-background"
                                value={data.status}
                                onChange={e => setData('status', e.target.value)}
                            >
                                <option value="bought">Bought</option>
                                <option value="keep">Keep</option>
                                <option value="sold_out">Sold Out</option>
                            </select>
                        </div>
                        <div className="space-y-1">
                            <Label>Courier</Label>
                            <Input value={data.courier} onChange={e => setData('courier', e.target.value)} placeholder="e.g. JNE, J&T" />
                        </div>
                    </div>

                    {/* Items */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <Label className="text-base">Order Items</Label>
                            <Button type="button" variant="outline" size="sm" onClick={addItem}>
                                <Plus className="size-4 mr-1" /> Add Item
                            </Button>
                        </div>
                        <div className="rounded-lg border overflow-hidden">
                            <table className="w-full text-sm">
                                <thead className="bg-muted text-muted-foreground">
                                    <tr>
                                        <th className="text-left px-3 py-2">Product</th>
                                        <th className="text-left px-3 py-2">Color</th>
                                        <th className="text-left px-3 py-2">Size</th>
                                        <th className="text-left px-3 py-2">Qty</th>
                                        <th className="text-left px-3 py-2">Price</th>
                                        <th className="text-right px-3 py-2">Total</th>
                                        <th className="px-3 py-2"></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.items.map((item: any, i: number) => (
                                        <tr key={i} className="border-t">
                                            <td className="px-2 py-2"><Input value={item.product_name} onChange={e => updateItem(i, 'product_name', e.target.value)} placeholder="Product name" /></td>
                                            <td className="px-2 py-2"><Input value={item.color} onChange={e => updateItem(i, 'color', e.target.value)} placeholder="Color" /></td>
                                            <td className="px-2 py-2"><Input value={item.size} onChange={e => updateItem(i, 'size', e.target.value)} placeholder="Size" /></td>
                                            <td className="px-2 py-2"><Input type="number" min="1" value={item.quantity} onChange={e => updateItem(i, 'quantity', e.target.value)} className="w-16" /></td>
                                            <td className="px-2 py-2"><Input type="number" min="0" value={item.price} onChange={e => updateItem(i, 'price', e.target.value)} className="w-28" /></td>
                                            <td className="px-3 py-2 text-right font-medium">
                                                {(Number(item.quantity) * Number(item.price)).toLocaleString()}
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
                    </div>

                    {/* Pricing */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <Label>Discount</Label>
                            <Input type="number" min="0" value={data.discount || ''} onChange={e => setData('discount', parseFloat(e.target.value) || 0)} />
                        </div>
                        <div className="space-y-1">
                            <Label>Shipping fee</Label>
                            <Input type="number" min="0" value={data.shipping_fee} onChange={e => setData('shipping_fee', parseFloat(e.target.value) || 0)} />
                        </div>
                        <div className="space-y-1">
                            <Label>Shipping fee / kg</Label>
                            <Input type="number" min="0" value={data.shipping_fee_per_kg} onChange={e => setData('shipping_fee_per_kg', parseFloat(e.target.value) || 0)} />
                        </div>
                        <div className="space-y-1">
                            <Label>Total shipping fee</Label>
                            <div className="rounded-md border px-3 py-2 text-sm bg-muted text-muted-foreground">
                                {Number(data.total_shipping_fee).toLocaleString()}
                            </div>
                        </div>
                        <div className="space-y-1">
                            <Label>Down payment</Label>
                            <Input type="number" min="0" value={data.down_payment} onChange={e => setData('down_payment', parseFloat(e.target.value) || 0)} />
                        </div>
                    </div>

                    {/* Summary */}
                    <div className="rounded-lg border p-4 space-y-2 text-sm bg-muted/30">
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Items subtotal</span>
                            <span>{itemsTotal.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Discount</span>
                            <span>- {Number(data.discount).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Shipping</span>
                            <span>+ {Number(data.total_shipping_fee).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between font-semibold border-t pt-2">
                            <span>Grand total</span>
                            <span>{grandTotal.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Down payment</span>
                            <span>- {Number(data.down_payment).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between font-semibold text-orange-600">
                            <span>Remaining</span>
                            <span>{remaining.toLocaleString()}</span>
                        </div>
                    </div>

                    <div className="space-y-1">
                        <Label>Notes</Label>
                        <textarea
                            className="w-full rounded-md border px-3 py-2 text-sm bg-background"
                            rows={2}
                            value={data.notes}
                            onChange={e => setData('notes', e.target.value)}
                        />
                    </div>

                    <Button type="submit" disabled={processing}>Update Order</Button>
                </form>
            </div>
        </>
    );
}

OrderEdit.layout = (page: any) => page;