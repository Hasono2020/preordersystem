import { useEffect, useState } from 'react';
import { Head, useForm, Link } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Trash2 } from 'lucide-react';

const emptyItem = { product_id: null, product_name: '', color: '', size: '', quantity: 1, price: 0, weight: 0, exclude_from_promo: false };

function calcKg(totalGrams: number): number {
    if (totalGrams <= 0) return 0;
    return Math.ceil((totalGrams - 200) / 1000) || 1;
}

function noScroll(e: React.WheelEvent<HTMLInputElement>) {
    (e.target as HTMLInputElement).blur();
}

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
            product_id:         i.product_id ?? null,
            product_name:       i.product_name,
            color:              i.color ?? '',
            size:               i.size  ?? '',
            quantity:           i.quantity,
            price:              Number(i.price),
            weight:             Number(i.product?.weight ?? 0),
            // FIX: read exclude_from_promo from the eager-loaded product
            // (items.product is now loaded by the controller).
            exclude_from_promo: i.product?.exclude_from_promo ?? false,
        })),
    });

    const [promoRules, setPromoRules]         = useState<any[]>([]);
    const [activePromo, setActivePromo]       = useState<any>(null);
    const [productSearch, setProductSearch]   = useState<Record<number, string>>({});
    const [productResults, setProductResults] = useState<Record<number, any[]>>({});
    const [selectedProducts, setSelectedProducts] = useState<Record<number, any>>({});

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

    // Auto-calculate weight from items
    useEffect(() => {
        const totalGrams = data.items.reduce((sum: number, item: any, i: number) => {
            const product = selectedProducts[i];
            const w = product ? Number(product.weight) : Number(item.weight ?? 0);
            return sum + (w * Number(item.quantity));
        }, 0);
        if (totalGrams > 0) {
            setData(prev => ({ ...prev, weight: calcKg(totalGrams) }));
        }
    }, [data.items, selectedProducts]);

    // Auto-apply promo discount
    useEffect(() => {
        if (promoRules.length === 0) return;

        const customer = customers.find((c: any) => String(c.id) === String(data.customer_id));

        // FIX: promo_type is now included in the customers list from the
        // controller, so reseller_promo customers correctly resolve to 'reseller'.
        const custType = customer?.promo_type === 'reseller_promo'
            ? 'reseller'
            : (customer?.type ?? 'normal');

        // FIX: use item.exclude_from_promo which is now correctly seeded from
        // the eager-loaded product for existing items, and from selectProduct()
        // for newly added items — both paths are now consistent.
        const eligibleQty = data.items.reduce((sum: number, item: any) =>
            sum + (item.exclude_from_promo ? 0 : Number(item.quantity)), 0);

        const matching = promoRules
            .filter(r => (r.customer_type === 'all' || r.customer_type === custType) && eligibleQty >= r.min_items)
            .sort((a, b) => b.min_items - a.min_items);

        // Reseller-specific rules take priority over 'all' rules
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

    // Product search
    async function searchProduct(i: number, query: string) {
        setProductSearch(prev => ({ ...prev, [i]: query }));
        const items = [...data.items];
        items[i] = { ...items[i], product_id: null, product_name: query };
        setData('items', items);
        if (query.length < 1) {
            setProductResults(prev => ({ ...prev, [i]: [] }));
            return;
        }
        const res     = await fetch(`/products-search?q=${encodeURIComponent(query)}`);
        const results = await res.json();
        setProductResults(prev => ({ ...prev, [i]: results }));
    }

    function getVariantStock(product: any, color: string, size: string): number {
        const variants = product?.variants ?? [];
        if (!color && !size) return product?.quantity ?? 0;
        const v = variants.find((v: any) =>
            v.color?.toUpperCase() === color?.toUpperCase() &&
            v.size?.toUpperCase()  === size?.toUpperCase()
        );
        return v ? Number(v.quantity) : 0;
    }

    function availableSizesForColor(product: any, color: string): string[] {
        const variants = product?.variants ?? [];
        if (!variants.length) return product?.sizes ?? [];
        return (product?.sizes ?? []).filter((s: string) =>
            variants.some((v: any) =>
                v.color?.toUpperCase() === color?.toUpperCase() &&
                v.size?.toUpperCase()  === s.toUpperCase() &&
                v.quantity > 0
            )
        );
    }

    function selectProduct(i: number, product: any) {
        const items    = [...data.items];
        const variants = product.variants ?? [];
        const firstAvail = variants.find((v: any) => v.quantity > 0);
        const defaultColor = firstAvail?.color ?? (product.colors?.[0] ?? '');
        const defaultSize  = firstAvail?.size  ?? (product.sizes?.[0]  ?? '');
        items[i] = {
            ...items[i],
            product_id:         product.id,
            product_name:       product.code + ' — ' + product.name,
            price:              product.price,
            color:              defaultColor,
            size:               defaultSize,
            weight:             product.weight,
            exclude_from_promo: product.exclude_from_promo ?? false,
        };
        setData('items', items);
        setProductSearch(prev => ({ ...prev, [i]: product.code + ' — ' + product.name }));
        setProductResults(prev => ({ ...prev, [i]: [] }));
        setSelectedProducts(prev => ({ ...prev, [i]: product }));
    }

    function addItem() {
        setData('items', [...data.items, { ...emptyItem }]);
    }

    function removeItem(i: number) {
        setData('items', data.items.filter((_: any, idx: number) => idx !== i));
        setProductSearch(prev => { const n = { ...prev }; delete n[i]; return n; });
        setProductResults(prev => { const n = { ...prev }; delete n[i]; return n; });
        setSelectedProducts(prev => { const n = { ...prev }; delete n[i]; return n; });
    }

    function updateItem(i: number, field: string, value: any) {
        const items = [...data.items];
        items[i] = { ...items[i], [field]: value };
        setData('items', items);
    }

    const itemsTotal   = data.items.reduce((sum: number, i: any) => sum + (Number(i.quantity) * Number(i.price)), 0);
    const grandTotal   = itemsTotal - Number(data.discount) + Number(data.total_shipping_fee);
    const rawRemaining = grandTotal - Number(data.down_payment);
    const remaining    = Math.max(0, rawRemaining);
    const overpaid     = rawRemaining < 0;

    function submit(e: React.FormEvent) {
        e.preventDefault();
        // Block submit if any item has 0 stock for selected variant
        for (let i = 0; i < data.items.length; i++) {
            const item    = data.items[i];
            const product = selectedProducts[i];
            if (product?.variants?.length && item.color && item.size) {
                const stock = getVariantStock(product, item.color, item.size);
                if (stock <= 0) {
                    alert(`"${item.product_name}" (${item.color} / ${item.size}) is out of stock. Please change or remove that item.`);
                    return;
                }
            }
        }
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
                        <div className="rounded-lg border overflow-visible">
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
                                    {data.items.map((item: any, i: number) => {
                                        const matched = selectedProducts[i];
                                        const colors  = matched?.colors ?? [];
                                        const sizes   = matched?.sizes  ?? [];

                                        return (
                                            <tr key={i} className="border-t">
                                                {/* Product search */}
                                                <td className="px-2 py-2 relative min-w-45">
                                                    <div className="flex items-center gap-1">
                                                        <Input
                                                            value={productSearch[i] ?? item.product_name}
                                                            onChange={e => searchProduct(i, e.target.value)}
                                                            placeholder="Search code or name..."
                                                            className={item.exclude_from_promo ? 'border-orange-300' : ''}
                                                        />
                                                        {item.exclude_from_promo && (
                                                            <span className="text-xs text-orange-500 whitespace-nowrap">no promo</span>
                                                        )}
                                                    </div>
                                                    {(productResults[i] ?? []).length > 0 && (
                                                        <div className="absolute z-20 top-full left-0 w-72 bg-background border rounded-lg shadow-lg mt-1">
                                                            {productResults[i].map((p: any) => (
                                                                <button
                                                                    key={p.id}
                                                                    type="button"
                                                                    disabled={p.quantity <= 0}
                                                                    className={`w-full text-left px-3 py-2 text-sm flex justify-between items-center gap-2 ${
                                                                        p.quantity <= 0 ? 'opacity-50 cursor-not-allowed bg-muted/50' : 'hover:bg-muted'
                                                                    }`}
                                                                    onClick={() => p.quantity > 0 && selectProduct(i, p)}
                                                                >
                                                                    <span>
                                                                        <span className="font-mono font-semibold">{p.code}</span>
                                                                        <span className="text-muted-foreground ml-1">— {p.name}</span>
                                                                    </span>
                                                                    <span className="shrink-0 flex items-center gap-2">
                                                                        <span className="text-xs text-muted-foreground">{Number(p.price).toLocaleString()}</span>
                                                                        {p.quantity <= 0 ? (
                                                                            <span className="text-xs font-medium text-red-500 bg-red-50 px-1.5 py-0.5 rounded">Out of stock</span>
                                                                        ) : (
                                                                            <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${p.quantity < 5 ? 'text-amber-600 bg-amber-50' : 'text-green-600 bg-green-50'}`}>
                                                                                {p.quantity} left
                                                                            </span>
                                                                        )}
                                                                    </span>
                                                                </button>
                                                            ))}
                                                        </div>
                                                    )}
                                                </td>

                                                {/* Color */}
                                                <td className="px-2 py-2 min-w-25">
                                                    {colors.length > 0 ? (
                                                        <select className="w-full rounded-md border px-2 py-2 text-sm bg-background"
                                                            value={item.color}
                                                            onChange={e => {
                                                                const newColor = e.target.value;
                                                                updateItem(i, 'color', newColor);
                                                                const avail = availableSizesForColor(matched, newColor);
                                                                const nextSize = avail[0] ?? (matched?.sizes?.[0] ?? '');
                                                                updateItem(i, 'size', nextSize);
                                                            }}>
                                                            <option value="">Color</option>
                                                            {colors.map((c: string) => {
                                                                const hasStock = matched?.variants?.length
                                                                    ? matched.variants.some((v: any) => v.color?.toUpperCase() === c.toUpperCase() && v.quantity > 0)
                                                                    : true;
                                                                return (
                                                                    <option key={c} value={c}>
                                                                        {c}{!hasStock ? ' (no stock)' : ''}
                                                                    </option>
                                                                );
                                                            })}
                                                        </select>
                                                    ) : (
                                                        <Input value={item.color} onChange={e => updateItem(i, 'color', e.target.value)} placeholder="Color" />
                                                    )}
                                                </td>

                                                {/* Size */}
                                                <td className="px-2 py-2 min-w-20">
                                                    {sizes.length > 0 ? (
                                                        <select className="w-full rounded-md border px-2 py-2 text-sm bg-background"
                                                            value={item.size} onChange={e => updateItem(i, 'size', e.target.value)}>
                                                            <option value="">Size</option>
                                                            {sizes.map((s: string) => {
                                                                const variantStock = matched?.variants?.length
                                                                    ? getVariantStock(matched, item.color, s)
                                                                    : null;
                                                                const outOfStock = variantStock !== null && variantStock <= 0;
                                                                return (
                                                                    <option key={s} value={s}>
                                                                        {s}{outOfStock ? ' (no stock)' : variantStock !== null ? ` (${variantStock})` : ''}
                                                                    </option>
                                                                );
                                                            })}
                                                        </select>
                                                    ) : (
                                                        <Input value={item.size} onChange={e => updateItem(i, 'size', e.target.value)} placeholder="Size" />
                                                    )}
                                                </td>

                                                <td className="px-2 py-2">
                                                    <Input
                                                        type="number" min="1"
                                                        onWheel={noScroll}
                                                        value={item.quantity === 0 ? '' : item.quantity}
                                                        onChange={e => updateItem(i, 'quantity', e.target.value === '' ? '' : parseInt(e.target.value) || 1)}
                                                        onBlur={e => { if (e.target.value === '' || Number(e.target.value) < 1) updateItem(i, 'quantity', 1); }}
                                                        className="w-16"
                                                    />
                                                    {matched?.variants?.length > 0 && item.color && item.size && (() => {
                                                        const stock = getVariantStock(matched, item.color, item.size);
                                                        return (
                                                            <span className={`text-xs mt-0.5 block font-medium ${
                                                                stock <= 0 ? 'text-red-500' :
                                                                stock < 5  ? 'text-amber-500' : 'text-green-600'
                                                            }`}>
                                                                {stock <= 0 ? '⚠ No stock — cannot order' : `${stock} left`}
                                                            </span>
                                                        );
                                                    })()}
                                                </td>
                                                <td className="px-2 py-2">
                                                    <Input
                                                        type="number" min="0"
                                                        onWheel={noScroll}
                                                        value={item.price || ''}
                                                        onChange={e => updateItem(i, 'price', parseFloat(e.target.value) || 0)}
                                                        className="w-28"
                                                    />
                                                </td>
                                                <td className="px-3 py-2 text-right font-medium whitespace-nowrap">
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
                                        );
                                    })}
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
                            <Input type="number" min="0" step="0.1" onWheel={noScroll}
                                value={data.weight || ''}
                                onChange={e => setData('weight', parseFloat(e.target.value) || 0)} />
                        </div>
                        <div className="space-y-1">
                            <Label>Shipping fee / kg</Label>
                            <Input type="number" min="0" onWheel={noScroll}
                                value={data.shipping_fee_per_kg || ''}
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
                            <Input type="number" min="0" onWheel={noScroll}
                                value={data.down_payment || ''}
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
                                    {activePromo.discount_flat > 0 && <p>• Flat discount: Rp{Number(activePromo.discount_flat).toLocaleString()}</p>}
                                    {activePromo.discount_per_item > 0 && <p>• Per-item: Rp{Number(activePromo.discount_per_item).toLocaleString()} × {eligibleQty} eligible items</p>}
                                    {activePromo.free_shipping_max > 0 && <p>• Free shipping up to Rp{Number(activePromo.free_shipping_max).toLocaleString()}</p>}
                                    {excludedQty > 0 && <p className="text-orange-600">⚠ {excludedQty} item(s) excluded from promo</p>}
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