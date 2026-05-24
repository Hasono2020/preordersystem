import { useEffect, useState } from 'react';
import { Head, useForm, Link } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Trash2, Users, UserPlus } from 'lucide-react';

const emptyItem = { product_id: null, product_name: '', color: '', size: '', quantity: 1, price: 0, weight: 0 };

function calcKg(totalGrams: number): number {
    if (totalGrams <= 0) return 0;
    return Math.ceil((totalGrams - 200) / 1000) || 1;
}

export default function OrderCreate({ customers, areas }: any) {
    const [customerMode, setCustomerMode] = useState<'existing' | 'new'>('existing');

    const { data, setData, post, processing, errors } = useForm({
        customer_mode:        'existing',
        customer_id:          '',
        new_customer_name:    '',
        new_customer_phone:   '',
        new_customer_address: '',
        new_customer_area_id: '',
        order_date:           new Date().toISOString().slice(0, 10),
        status:               'bought',
        discount:             0,
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
    const [productResults, setProductResults]     = useState<Record<number, any[]>>({});
    const [selectedProducts, setSelectedProducts] = useState<Record<number, any>>({});
    const [customerSearch, setCustomerSearch]     = useState('');
    const [filteredCustomers, setFilteredCustomers] = useState(customers);

    // Sync customer mode to form
    useEffect(() => {
        setData('customer_mode', customerMode);
    }, [customerMode]);

    // Filter customers by search
    useEffect(() => {
        if (customerSearch.trim() === '') {
            setFilteredCustomers(customers);
        } else {
            setFilteredCustomers(
                customers.filter((c: any) =>
                    c.name.toLowerCase().includes(customerSearch.toLowerCase())
                )
            );
        }
    }, [customerSearch, customers]);

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

    // Auto-calculate weight from items
    useEffect(() => {
        const totalGrams = data.items.reduce((sum: number, item: any, i: number) => {
            const product = selectedProducts[i];
            return sum + (product ? Number(product.weight) * Number(item.quantity) : 0);
        }, 0);
        setData(prev => ({ ...prev, weight: calcKg(totalGrams) }));
    }, [data.items, selectedProducts]);

    // Auto-calculate total shipping fee
    useEffect(() => {
        const total = Number(data.weight) * Number(data.shipping_fee_per_kg);
        setData('total_shipping_fee', total);
    }, [data.weight, data.shipping_fee_per_kg]);

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

    function selectProduct(i: number, product: any) {
        const items        = [...data.items];
        const defaultColor = product.colors?.length > 0 ? product.colors[0] : '';
        const defaultSize  = product.sizes?.length  > 0 ? product.sizes[0]  : '';
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
                            <div className="space-y-2">
                                <Input
                                    placeholder="Search customer by name..."
                                    value={customerSearch}
                                    onChange={e => setCustomerSearch(e.target.value)}
                                />
                                <select
                                    className="w-full rounded-md border px-3 py-2 text-sm bg-background"
                                    value={data.customer_id}
                                    onChange={e => setData('customer_id', e.target.value)}
                                    size={filteredCustomers.length > 5 ? 5 : filteredCustomers.length + 1}
                                >
                                    <option value="">— Select customer —</option>
                                    {filteredCustomers.map((c: any) => (
                                        <option key={c.id} value={c.id}>
                                            {c.name} {c.phone ? `(${c.phone})` : ''}
                                        </option>
                                    ))}
                                </select>
                                {errors.customer_id && <p className="text-xs text-destructive">{errors.customer_id}</p>}
                                {data.customer_id && (
                                    <div className="text-xs text-muted-foreground bg-muted/30 rounded-lg px-3 py-2">
                                        Selected: <strong>{customers.find((c: any) => String(c.id) === String(data.customer_id))?.name}</strong>
                                        {data.shipping_fee_per_kg > 0 && (
                                            <span className="ml-2">· Shipping rate: {Number(data.shipping_fee_per_kg).toLocaleString()}/kg</span>
                                        )}
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
                                                <td className="px-2 py-2 relative min-w-45">
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
                                                <td className="px-2 py-2 min-w-25">
                                                    {colors.length > 0 ? (
                                                        <select
                                                            className="w-full rounded-md border px-2 py-2 text-sm bg-background"
                                                            value={item.color}
                                                            onChange={e => updateItem(i, 'color', e.target.value)}
                                                        >
                                                            <option value="">Color</option>
                                                            {colors.map((c: string) => (
                                                                <option key={c} value={c}>{c}</option>
                                                            ))}
                                                        </select>
                                                    ) : (
                                                        <Input value={item.color} onChange={e => updateItem(i, 'color', e.target.value)} placeholder="Color" />
                                                    )}
                                                </td>
                                                <td className="px-2 py-2 min-w-20">
                                                    {sizes.length > 0 ? (
                                                        <select
                                                            className="w-full rounded-md border px-2 py-2 text-sm bg-background"
                                                            value={item.size}
                                                            onChange={e => updateItem(i, 'size', e.target.value)}
                                                        >
                                                            <option value="">Size</option>
                                                            {sizes.map((s: string) => (
                                                                <option key={s} value={s}>{s}</option>
                                                            ))}
                                                        </select>
                                                    ) : (
                                                        <Input value={item.size} onChange={e => updateItem(i, 'size', e.target.value)} placeholder="Size" />
                                                    )}
                                                </td>
                                                <td className="px-2 py-2">
                                                    <Input
                                                        type="number" min="1"
                                                        value={item.quantity}
                                                        onChange={e => updateItem(i, 'quantity', parseInt(e.target.value) || 1)}
                                                        className="w-16"
                                                    />
                                                </td>
                                                <td className="px-2 py-2">
                                                    <Input
                                                        type="number" min="0"
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
                        <div className="space-y-1">
                            <Label>Discount</Label>
                            <Input type="number" min="0" value={data.discount || ''} onChange={e => setData('discount', parseFloat(e.target.value) || 0)} />
                        </div>
                        <div className="space-y-1 col-span-2">
                            <Label>Down payment</Label>
                            <Input type="number" min="0" value={data.down_payment || ''} onChange={e => setData('down_payment', parseFloat(e.target.value) || 0)} />
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