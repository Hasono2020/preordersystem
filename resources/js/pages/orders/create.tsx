import { useEffect, useState } from 'react';
import { Head, useForm, Link } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Trash2, Users, UserPlus, ChevronDown } from 'lucide-react';

const emptyItem = { product_id: null, product_name: '', color: '', size: '', quantity: 1, price: 0, weight: 0 };

function calcKg(totalGrams: number): number {
    if (totalGrams <= 0) return 0;
    return Math.ceil((totalGrams - 200) / 1000) || 1;
}

// Prevent scroll wheel from changing number inputs
function noScroll(e: React.WheelEvent<HTMLInputElement>) {
    (e.target as HTMLInputElement).blur();
}

export default function OrderCreate({ customers, areas }: any) {
    const [customerMode, setCustomerMode]     = useState<'existing' | 'new'>('existing');
    const [customerSearch, setCustomerSearch] = useState('');
    const [showDropdown, setShowDropdown]     = useState(false);

    const { data, setData, post, processing, errors } = useForm({
        customer_mode:        'existing',
        customer_id:          '',
        new_customer_name:    '',
        new_customer_phone:   '',
        new_customer_address: '',
        new_customer_area_id: '',
        new_customer_type:       'normal',
        new_customer_promo_type: 'default',
        order_date:           new Date().toISOString().slice(0, 10),
        status:               'bought',
        discount:             0,
        discount_product:     0,
        discount_shipping:    0,
        shipping_fee_per_kg:  0,
        total_shipping_fee:   0,
        weight:               0,
        down_payment:         0,
        courier:              '',
        notes:                '',
        area_id:              '',
        items:                [{ ...emptyItem }],
    });

    const [productSearch, setProductSearch]       = useState<Record<number, string>>({});
    const [promoRules, setPromoRules]             = useState<any[]>([]);
    const [activePromo, setActivePromo]           = useState<any>(null);
    const [productResults, setProductResults]     = useState<Record<number, any[]>>({});
    const [selectedProducts, setSelectedProducts] = useState<Record<number, any>>({});

    const filteredCustomers = customerSearch.trim() === ''
        ? customers
        : customers.filter((c: any) =>
            c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
            (c.phone && c.phone.includes(customerSearch))
          );

    const selectedCustomer = customers.find((c: any) => String(c.id) === String(data.customer_id));

    // Sync customer mode
    useEffect(() => {
        setData('customer_mode', customerMode);
    }, [customerMode]);

    // Auto-fill shipping when existing customer selected
    useEffect(() => {
        if (customerMode === 'existing' && data.customer_id) {
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
    }, [data.customer_id, customerMode]);

    // Auto-fill shipping when new customer area selected
    useEffect(() => {
        if (customerMode === 'new' && data.new_customer_area_id) {
            const area = areas.find((a: any) => String(a.id) === String(data.new_customer_area_id));
            if (area) {
                setData(prev => ({
                    ...prev,
                    area_id:             String(area.id),
                    shipping_fee_per_kg: Number(area.price_per_kg),
                }));
            }
        }
    }, [data.new_customer_area_id, customerMode]);

    // Fetch active promo rules from API on mount
    useEffect(() => {
        fetch('/promo-rules/api')
            .then(r => r.json())
            .then(setPromoRules)
            .catch(() => {});
    }, []);

    // Auto-calculate weight
    useEffect(() => {
        const totalGrams = data.items.reduce((sum: number, item: any, i: number) => {
            const product = selectedProducts[i];
            return sum + (product ? Number(product.weight) * Number(item.quantity) : 0);
        }, 0);
        setData(prev => ({ ...prev, weight: calcKg(totalGrams) }));
    }, [data.items, selectedProducts]);

    // Auto-calculate shipping fee
    useEffect(() => {
        const total = Number(data.weight) * Number(data.shipping_fee_per_kg);
        setData('total_shipping_fee', total);
    }, [data.weight, data.shipping_fee_per_kg]);

    // Auto-apply promo discount based on customer type + total items
    useEffect(() => {
        if (promoRules.length === 0) return;

        // promo_type='reseller_promo' overrides customer type for rule matching
        const custType = customerMode === 'existing'
            ? (selectedCustomer?.promo_type === 'reseller_promo' ? 'reseller' : (selectedCustomer?.type ?? 'normal'))
            : (data.new_customer_promo_type === 'reseller_promo' ? 'reseller' : data.new_customer_type);

        // Only count items whose linked product is NOT excluded from promo
        const eligibleQty = data.items.reduce((sum: number, item: any, i: number) => {
            const product = selectedProducts[i];
            return sum + (product?.exclude_from_promo ? 0 : Number(item.quantity));
        }, 0);

        // Rule matching uses eligible qty only
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
    }, [data.items, data.total_shipping_fee, data.customer_id, data.new_customer_type, data.new_customer_promo_type, customerMode, promoRules, selectedProducts]);

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

    // Returns stock for a specific color+size combo
    function getVariantStock(product: any, color: string, size: string): number {
        const variants = product?.variants ?? [];
        if (!color && !size) return product?.quantity ?? 0;
        const v = variants.find((v: any) =>
            v.color?.toUpperCase() === color?.toUpperCase() &&
            v.size?.toUpperCase()  === size?.toUpperCase()
        );
        return v ? Number(v.quantity) : 0;
    }

    // Returns colors that have at least one size with stock > 0
    function availableColors(product: any): string[] {
        const variants = product?.variants ?? [];
        if (!variants.length) return product?.colors ?? [];
        return (product?.colors ?? []).filter((c: string) =>
            variants.some((v: any) => v.color?.toUpperCase() === c.toUpperCase() && v.quantity > 0)
        );
    }

    // Returns sizes for a given color that have stock > 0
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
        // Pick first color+size with stock > 0
        const firstAvail = variants.find((v: any) => v.quantity > 0);
        const defaultColor = firstAvail?.color ?? (product.colors?.[0] ?? '');
        const defaultSize  = firstAvail?.size  ?? (product.sizes?.[0]  ?? '');
        items[i] = {
            ...items[i],
            product_id:   product.id,
            product_name: product.code + ' — ' + product.name,
            price:        product.price,
            color:        defaultColor,
            size:         defaultSize,
            weight:       product.weight,
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
        items[i]    = { ...items[i], [field]: value };
        setData('items', items);
    }

    const itemsTotal = data.items.reduce((sum: number, i: any) => sum + (Number(i.quantity) * Number(i.price)), 0);
    const grandTotal = itemsTotal - Number(data.discount) + Number(data.total_shipping_fee);
    const remaining  = grandTotal - Number(data.down_payment);
    const totalGrams = data.items.reduce((sum: number, item: any, i: number) => {
        const product = selectedProducts[i];
        return sum + (product ? Number(product.weight) * Number(item.quantity) : 0);
    }, 0);

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
        post('/orders');
    }

    return (
        <>
            <Head title="New Order" />
            <div className="p-6 max-w-3xl space-y-6">
                <div className="flex items-center gap-3">
                    <Link href="/orders" className="text-muted-foreground hover:text-foreground text-sm">← Back</Link>
                    <h1 className="text-xl font-semibold">New Order</h1>
                </div>

                <form onSubmit={submit} className="space-y-6">

                    {/* Customer Section */}
                    <div className="rounded-xl border p-4 space-y-4">
                        <div className="flex items-center justify-between">
                            <Label className="text-base font-semibold">Customer</Label>
                            <div className="flex rounded-lg border overflow-hidden text-xs font-medium">
                                <button
                                    type="button"
                                    onClick={() => setCustomerMode('existing')}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 transition-colors ${
                                        customerMode === 'existing'
                                            ? 'bg-primary text-primary-foreground'
                                            : 'hover:bg-muted'
                                    }`}
                                >
                                    <Users className="size-3" /> Existing
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setCustomerMode('new')}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 transition-colors border-l ${
                                        customerMode === 'new'
                                            ? 'bg-primary text-primary-foreground'
                                            : 'hover:bg-muted'
                                    }`}
                                >
                                    <UserPlus className="size-3" /> New
                                </button>
                            </div>
                        </div>

                        {customerMode === 'existing' ? (
                            <div className="relative">
                                {/* Search + trigger */}
                                <div
                                    className="w-full rounded-md border px-3 py-2 text-sm bg-background flex items-center justify-between cursor-pointer gap-2"
                                    onClick={() => setShowDropdown(v => !v)}
                                >
                                    <span className={selectedCustomer ? 'text-foreground' : 'text-muted-foreground'}>
                                        {selectedCustomer
                                            ? `${selectedCustomer.name}${selectedCustomer.phone ? ` (${selectedCustomer.phone})` : ''}`
                                            : 'Search or select customer...'}
                                    </span>
                                    <ChevronDown className="size-4 text-muted-foreground shrink-0" />
                                </div>

                                {/* Dropdown */}
                                {showDropdown && (
                                    <div className="absolute z-30 top-full left-0 right-0 mt-1 bg-background border rounded-xl shadow-lg">
                                        <div className="p-2 border-b">
                                            <Input
                                                autoFocus
                                                placeholder="Search by name or phone..."
                                                value={customerSearch}
                                                onChange={e => setCustomerSearch(e.target.value)}
                                                onClick={e => e.stopPropagation()}
                                            />
                                        </div>
                                        <div className="max-h-52 overflow-y-auto">
                                            {filteredCustomers.length === 0 ? (
                                                <p className="px-3 py-4 text-sm text-center text-muted-foreground">No customers found.</p>
                                            ) : (
                                                filteredCustomers.map((c: any) => (
                                                    <button
                                                        key={c.id}
                                                        type="button"
                                                        className={`w-full text-left px-3 py-2.5 text-sm hover:bg-muted flex justify-between items-center ${
                                                            String(c.id) === String(data.customer_id) ? 'bg-muted font-medium' : ''
                                                        }`}
                                                        onClick={() => {
                                                            setData('customer_id', String(c.id));
                                                            setShowDropdown(false);
                                                            setCustomerSearch('');
                                                        }}
                                                    >
                                                        <span>{c.name}</span>
                                                        {c.phone && <span className="text-xs text-muted-foreground">{c.phone}</span>}
                                                    </button>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                )}

                                {errors.customer_id && <p className="text-xs text-destructive mt-1">{errors.customer_id}</p>}

                                {/* Selected info */}
                                {selectedCustomer && data.shipping_fee_per_kg > 0 && (
                                    <div className="mt-2 text-xs text-muted-foreground bg-muted/30 rounded-lg px-3 py-2">
                                        Shipping rate: <strong>{Number(data.shipping_fee_per_kg).toLocaleString()}/kg</strong>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1 col-span-2">
                                    <Label>Name *</Label>
                                    <Input
                                        value={data.new_customer_name}
                                        onChange={e => setData('new_customer_name', e.target.value)}
                                        placeholder="Customer name"
                                    />
                                    {errors.new_customer_name && <p className="text-xs text-destructive">{errors.new_customer_name}</p>}
                                </div>
                                <div className="space-y-1">
                                    <Label>Phone</Label>
                                    <Input
                                        value={data.new_customer_phone}
                                        onChange={e => setData('new_customer_phone', e.target.value)}
                                        placeholder="e.g. 08123456789"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label>Shipping Area</Label>
                                    <select
                                        className="w-full rounded-md border px-3 py-2 text-sm bg-background"
                                        value={data.new_customer_area_id}
                                        onChange={e => setData('new_customer_area_id', e.target.value)}
                                    >
                                        <option value="">— Select area —</option>
                                        {areas.map((area: any) => (
                                            <option key={area.id} value={area.id}>
                                                {area.name} — {Number(area.price_per_kg).toLocaleString()}/kg
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-1 col-span-2">
                                    <Label>Address</Label>
                                    <textarea
                                        className="w-full rounded-md border px-3 py-2 text-sm bg-background"
                                        rows={2}
                                        value={data.new_customer_address}
                                        onChange={e => setData('new_customer_address', e.target.value)}
                                        placeholder="Customer address"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label>Customer Type</Label>
                                    <select className="w-full rounded-md border px-3 py-2 text-sm bg-background"
                                        value={data.new_customer_type}
                                        onChange={e => setData('new_customer_type', e.target.value)}>
                                        <option value="normal">Normal Customer</option>
                                        <option value="reseller">Reseller</option>
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <Label>Promo Override</Label>
                                    <select className="w-full rounded-md border px-3 py-2 text-sm bg-background"
                                        value={data.new_customer_promo_type}
                                        onChange={e => setData('new_customer_promo_type', e.target.value)}>
                                        <option value="default">Default (follow customer type)</option>
                                        <option value="reseller_promo">Reseller Promo (gets reseller discounts)</option>
                                    </select>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Order Info */}
                    <div className="grid grid-cols-2 gap-4">
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
                        <div className="space-y-1 col-span-2">
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
                                        <th className="text-left px-3 py-2 w-52">Product</th>
                                        <th className="text-left px-3 py-2 w-32">Color</th>
                                        <th className="text-left px-3 py-2 w-28">Size</th>
                                        <th className="text-left px-3 py-2 w-24">Qty</th>
                                        <th className="text-left px-3 py-2 w-28">Price</th>
                                        <th className="text-right px-3 py-2 w-24">Total</th>
                                        <th className="px-3 py-2 w-10"></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.items.map((item: any, i: number) => {
                                        const matched = selectedProducts[i];
                                        const colors  = matched?.colors ?? [];
                                        const sizes   = matched?.sizes  ?? [];

                                        return (
                                            <tr key={i} className="border-t">
                                                <td className="px-2 py-2 relative w-52">
                                                    <Input
                                                        value={productSearch[i] ?? item.product_name}
                                                        onChange={e => searchProduct(i, e.target.value)}
                                                        placeholder="Search code or name..."
                                                    />
                                                    {(productResults[i] ?? []).length > 0 && (
                                                        <div className="absolute z-20 top-full left-0 w-72 bg-background border rounded-lg shadow-lg mt-1">
                                                            {productResults[i].map((p: any) => (
                                                                <button
                                                                    key={p.id}
                                                                    type="button"
                                                                    disabled={p.quantity <= 0}
                                                                    className={`w-full text-left px-3 py-2 text-sm flex justify-between items-center gap-2 ${
                                                                        p.quantity <= 0
                                                                            ? 'opacity-50 cursor-not-allowed bg-muted/50'
                                                                            : 'hover:bg-muted'
                                                                    }`}
                                                                    onClick={() => p.quantity > 0 && selectProduct(i, p)}
                                                                >
                                                                    <span>
                                                                        <span className="font-mono font-semibold">{p.code}</span>
                                                                        <span className="text-muted-foreground ml-1">— {p.name}</span>
                                                                    </span>
                                                                    <span className="shrink-0 flex items-center gap-2">
                                                                        <span className="text-xs text-muted-foreground">
                                                                            {Number(p.price).toLocaleString()}
                                                                        </span>
                                                                        {p.quantity <= 0 ? (
                                                                            <span className="text-xs font-medium text-red-500 bg-red-50 px-1.5 py-0.5 rounded">
                                                                                Out of stock
                                                                            </span>
                                                                        ) : (
                                                                            <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${
                                                                                p.quantity < 5
                                                                                    ? 'text-amber-600 bg-amber-50'
                                                                                    : 'text-green-600 bg-green-50'
                                                                            }`}>
                                                                                {p.quantity} left
                                                                            </span>
                                                                        )}
                                                                    </span>
                                                                </button>
                                                            ))}
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-2 py-2 w-32">
                                                    {colors.length > 0 ? (
                                                        <select
                                                            className="w-full rounded-md border px-2 py-2 text-sm bg-background"
                                                            value={item.color}
                                                            onChange={e => {
                                                                const newColor = e.target.value;
                                                                const avail    = availableSizesForColor(matched, newColor);
                                                                const nextSize = avail[0] ?? (matched?.sizes?.[0] ?? '');
                                                                // Update color + size atomically in one setData call
                                                                const items = [...data.items];
                                                                items[i] = { ...items[i], color: newColor, size: nextSize };
                                                                setData('items', items);
                                                            }}
                                                        >
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
                                                <td className="px-2 py-2 w-28">
                                                    {sizes.length > 0 ? (
                                                        <select
                                                            className="w-full rounded-md border px-2 py-2 text-sm bg-background"
                                                            value={item.size}
                                                            onChange={e => updateItem(i, 'size', e.target.value)}
                                                        >
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
                                                {/* Qty — allows clearing and retyping */}
                                                <td className="px-2 py-2">
                                                    <Input
                                                        type="number"
                                                        min="1"
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
                                                        type="number"
                                                        min="0"
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

                    {/* Shipping & Pricing */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <Label>Shipping fee / kg</Label>
                            <div className="rounded-md border px-3 py-2 text-sm bg-muted text-muted-foreground">
                                {Number(data.shipping_fee_per_kg).toLocaleString()}
                            </div>
                        </div>
                        <div className="space-y-1">
                            <Label>
                                Weight (kg)
                                {totalGrams > 0 && (
                                    <span className="ml-2 text-xs text-muted-foreground font-normal">
                                        ({totalGrams}g → {data.weight}kg)
                                    </span>
                                )}
                            </Label>
                            <div className="rounded-md border px-3 py-2 text-sm bg-muted text-muted-foreground">
                                {data.weight} kg
                            </div>
                        </div>
                        <div className="space-y-1">
                            <Label>Total shipping fee</Label>
                            <div className="rounded-md border px-3 py-2 text-sm bg-muted text-muted-foreground">
                                {Number(data.total_shipping_fee).toLocaleString()}
                            </div>
                        </div>
                        <div className="space-y-1 col-span-2">
                            <Label>Down payment</Label>
                            <Input
                                type="number" min="0"
                                onWheel={noScroll}
                                value={data.down_payment || ''}
                                onChange={e => setData('down_payment', parseFloat(e.target.value) || 0)}
                            />
                        </div>
                    </div>

                    {/* Summary */}
                    <div className="rounded-lg border p-4 space-y-2 text-sm bg-muted/30">
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Items subtotal</span>
                            <span>{itemsTotal.toLocaleString()}</span>
                        </div>
                        {activePromo && (() => {
                            const eligibleQty = data.items.reduce((s: number, item: any, i: number) =>
                                s + (selectedProducts[i]?.exclude_from_promo ? 0 : Number(item.quantity)), 0);
                            const excludedQty = data.items.reduce((s: number, item: any, i: number) =>
                                s + (selectedProducts[i]?.exclude_from_promo ? Number(item.quantity) : 0), 0);
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

                    <Button type="submit" disabled={processing}>Save Order</Button>
                </form>
            </div>
        </>
    );
}

OrderCreate.layout = (page: any) => page;