import { useEffect, useState } from 'react';
import { Head, useForm, Link } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Trash2 } from 'lucide-react';

const emptyItem = { product_id: null, product_name: '', color: '', size: '', quantity: 1, price: 0, exclude_from_promo: false };

export default function OrderEdit({ order, customers, areas }: any) {
    const { data, setData, patch, processing, errors } = useForm({
        customer_id:         String(order.customer_id),
        order_date:          order.order_date,
        status:              order.status,
        discount:            Number(order.discount),
        discount_product:    Number(order.discount_product  ?? 0),
        discount_shipping:   Number(order.discount_shipping ?? 0),
        shipping_fee_per_kg: Number(order.shipping_fee_per_kg),
        total_shipping_fee:  Number(order.total_shipping_fee),
        weight:              Number(order.weight ?? 0),
        down_payment:        Number(order.down_payment),
        courier:             order.courier ?? '',
        notes:               order.notes ?? '',
        area_id:             order.customer?.area_id ? String(order.customer.area_id) : '',
        items:               order.items.map((i: any) => ({
            product_id:          i.product_id ?? null,
            product_name:        i.product_name,
            color:               i.color ?? '',
            size:                i.size  ?? '',
            quantity:            i.quantity,
            price:               Number(i.price),
            // Pass exclude_from_promo from the eagerly-loaded product relation
            exclude_from_promo:  i.product?.exclude_from_promo ?? false,
        })),
    });

    const [promoRules, setPromoRules] = useState<any[]>([]);
    const [activePromo, setActivePromo] = useState<any>(null);

    // Fetch active promo rules on mount
    useEffect(() => {
        fetch('/promo-rules/api')
            .then(r => r.json())
            .then(setPromoRules)
            .catch(() => {});
    }, []);

    // Auto-calculate total shipping fee
    useEffect(() => {
        const total = Number(data.weight) * Number(data.shipping_fee_per_kg);
        setData('total_shipping_fee', total);
    }, [data.weight, data.shipping_fee_per_kg]);

    // Auto-fill shipping when customer changes
    useEffect(() => {
        if (data.customer_id) {
            const customer = customers.find((c: any) => String(c.id) === String(data.customer_id));
            if (customer?.area_id) {
                const area = areas.find((a: any) => a.id === customer.area_id);
                if (area) {
                    setData(prev => ({
                        ...prev,
                        area_id:             String(area.id),
                        shipping_fee_per_kg: Number(area.price_per_kg),
                    }));
                }
            } else {
                setData(prev => ({ ...prev, area_id: '', shipping_fee_per_kg: 0 }));
            }
        }
    }, [data.customer_id]);

    // Auto-apply promo discount based on customer type + eligible items
    useEffect(() => {
        if (promoRules.length === 0) return;

        const customer = customers.find((c: any) => String(c.id) === String(data.customer_id));
        // promo_type='reseller_promo' overrides customer type for rule matching
        const custType = customer?.promo_type === 'reseller_promo' ? 'reseller' : (customer?.type ?? 'normal');

        // Only count items NOT excluded from promo
        const eligibleQty = data.items.reduce((sum: number, item: any) => {
            return sum + (item.exclude_from_promo ? 0 : Number(item.quantity));
        }, 0);

        const matching = promoRules
            .filter(r => (r.customer_type === 'all' || r.customer_type === custType) && eligibleQty >= r.min_items)
            .sort((a, b) => b.min_items - a.min_items);

        const resellerMatch = matching.find(r => r.customer_type === 'reseller');
        const best = resellerMatch ?? matching[0] ?? null;

        setActivePromo(best);

        if (!best || eligibleQty === 0) {
            setData(prev => ({ ...prev, discount: 0, discount_product: 0, discount_shipping: 0 }));
            return;
        }

        const shippingFee     = Number(data.weight) * Number(data.shipping_fee_per_kg);
        const freeShip        = Math.min(shippingFee, best.free_shipping_max);
        const discountFlat    = best.discount_flat;
        const discountPerItem = best.discount_per_item * eligibleQty;
        const productDiscount = discountFlat + discountPerItem;
        const totalDiscount   = productDiscount + freeShip;

        setData(prev => ({ ...prev, discount: totalDiscount, discount_product: productDiscount, discount_shipping: freeShip }));
    }, [data.items, data.total_shipping_fee, data.customer_id, promoRules]);

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
    const rawRemaining = grandTotal - Number(data.down_payment);
    const remaining    = Math.max(0, rawRemaining);
    const overpaid     = rawRemaining < 0;

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
                                    <option key={c.id} value={c.id}>
                                        {c.name} {c.type === 'reseller' ? '(Reseller)' : ''}
                                    </option>
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
                            <select className="w-full rounded-md border px-3 py-2 text-sm bg-background"
                                value={data.status} onChange={e => setData('status', e.target.value)}>
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
                                            <td className="px-2 py-2">
                                                <div className="flex items-center gap-1">
                                                    <Input value={item.product_name}
                                                        onChange={e => updateItem(i, 'product_name', e.target.value)}
                                                        placeholder="Product name"
                                                        className={item.exclude_from_promo ? 'border-orange-300' : ''} />
                                                    {item.exclude_from_promo && (
                                                        <span className="text-xs text-orange-500 whitespace-nowrap">no promo</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-2 py-2"><Input value={item.color} onChange={e => updateItem(i, 'color', e.target.value)} placeholder="Color" /></td>
                                            <td className="px-2 py-2"><Input value={item.size} onChange={e => updateItem(i, 'size', e.target.value)} placeholder="Size" /></td>
                                            <td className="px-2 py-2"><Input type="number" min="1" value={item.quantity} onChange={e => updateItem(i, 'quantity', parseInt(e.target.value) || 1)} className="w-16" /></td>
                                            <td className="px-2 py-2"><Input type="number" min="0" value={item.price || ''} onChange={e => updateItem(i, 'price', parseFloat(e.target.value) || 0)} className="w-28" /></td>
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
                        <div className="space-y-1 col-span-2">
                            <Label>Shipping Area</Label>
                            <select className="w-full rounded-md border px-3 py-2 text-sm bg-background"
                                value={data.area_id}
                                onChange={e => {
                                    const area = areas.find((a: any) => String(a.id) === e.target.value);
                                    setData(prev => ({
                                        ...prev,
                                        area_id:             e.target.value,
                                        shipping_fee_per_kg: area ? Number(area.price_per_kg) : 0,
                                    }));
                                }}
                            >
                                <option value="">— Select area —</option>
                                {areas.map((area: any) => (
                                    <option key={area.id} value={area.id}>
                                        {area.name} ({Number(area.price_per_kg).toLocaleString()}/kg)
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="space-y-1">
                            <Label>Weight (kg)</Label>
                            <Input type="number" min="0" step="0.1" value={data.weight || ''}
                                onChange={e => setData('weight', parseFloat(e.target.value) || 0)} />
                        </div>
                        <div className="space-y-1">
                            <Label>Shipping fee / kg</Label>
                            <Input type="number" min="0" value={data.shipping_fee_per_kg || ''}
                                onChange={e => setData('shipping_fee_per_kg', parseFloat(e.target.value) || 0)} />
                        </div>
                        <div className="space-y-1">
                            <Label>Total shipping fee</Label>
                            <div className="rounded-md border px-3 py-2 text-sm bg-muted text-muted-foreground">
                                {Number(data.total_shipping_fee).toLocaleString()}
                            </div>
                        </div>
                        <div className="space-y-1">
                            <Label>Discount <span className="text-xs font-normal text-muted-foreground">(auto-applied)</span></Label>
                            <div className="rounded-md border px-3 py-2 text-sm bg-muted text-muted-foreground">
                                {Number(data.discount).toLocaleString()}
                            </div>
                        </div>
                        <div className="space-y-1">
                            <Label>Down payment</Label>
                            <Input type="number" min="0" value={data.down_payment || ''}
                                onChange={e => setData('down_payment', parseFloat(e.target.value) || 0)} />
                        </div>
                    </div>

                    {/* Summary */}
                    <div className="rounded-lg border p-4 space-y-2 text-sm bg-muted/30">
                        {activePromo && (() => {
                            const eligibleQty = data.items.reduce((s: number, item: any) =>
                                s + (item.exclude_from_promo ? 0 : Number(item.quantity)), 0);
                            const excludedQty = data.items.reduce((s: number, item: any) =>
                                s + (item.exclude_from_promo ? Number(item.quantity) : 0), 0);
                            return (
                                <div className="text-xs bg-green-50 text-green-700 border border-green-200 rounded px-3 py-2 space-y-0.5">
                                    <p className="font-semibold">🎉 Promo: {activePromo.label}</p>
                                    {activePromo.discount_flat > 0 && (
                                        <p>• Flat discount: Rp{Number(activePromo.discount_flat).toLocaleString()}</p>
                                    )}
                                    {activePromo.discount_per_item > 0 && (
                                        <p>• Per-item: Rp{Number(activePromo.discount_per_item).toLocaleString()} × {eligibleQty} eligible items</p>
                                    )}
                                    {activePromo.free_shipping_max > 0 && (
                                        <p>• Free shipping up to Rp{Number(activePromo.free_shipping_max).toLocaleString()}</p>
                                    )}
                                    {excludedQty > 0 && (
                                        <p className="text-orange-600">⚠ {excludedQty} item(s) excluded from promo</p>
                                    )}
                                </div>
                            );
                        })()}
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Items subtotal</span>
                            <span>{itemsTotal.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Discount</span>
                            <span>- {Number(data.discount).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">
                                Shipping ({data.weight}kg × {Number(data.shipping_fee_per_kg).toLocaleString()})
                            </span>
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
                        {overpaid && (
                            <div className="text-xs text-destructive bg-destructive/10 rounded px-2 py-1">
                                Down payment exceeds total — it will be capped at the grand total.
                            </div>
                        )}
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