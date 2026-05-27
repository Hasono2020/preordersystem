import { Head, useForm, Link } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useEffect } from 'react';

export default function ProductCreate() {
    const { data, setData, post, processing, errors } = useForm({
        code: '', name: '', price: '', weight: '', quantity: '',
        colors: '', sizes: '', exclude_from_promo: false,
    });

    // Auto-toggle exclude_from_promo when code ends with Z (MZ, NZ, PZ, etc.)
    useEffect(() => {
        const upper = data.code.trim().toUpperCase();
        if (upper.endsWith('Z')) {
            setData('exclude_from_promo', true);
        }
    }, [data.code]);

    function submit(e: React.FormEvent) {
        e.preventDefault();
        post('/products');
    }

    return (
        <>
            <Head title="Add Product" />
            <div className="p-6 max-w-lg space-y-6">
                <div className="flex items-center gap-3">
                    <Link href="/products" className="text-muted-foreground hover:text-foreground text-sm">← Back</Link>
                    <h1 className="text-xl font-semibold">Add Product</h1>
                </div>

                <form onSubmit={submit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <Label>Product Code *</Label>
                            <Input
                                value={data.code}
                                onChange={e => setData('code', e.target.value)}
                                placeholder="e.g. NA_01 or MZ_01"
                                className="font-mono"
                            />
                            {errors.code && <p className="text-xs text-destructive">{errors.code}</p>}
                        </div>
                        <div className="space-y-1">
                            <Label>Product Name *</Label>
                            <Input value={data.name} onChange={e => setData('name', e.target.value)} placeholder="e.g. Kemeja Casual" />
                            {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
                        </div>
                        <div className="space-y-1">
                            <Label>Price *</Label>
                            <Input type="number" min="0" value={data.price} onChange={e => setData('price', e.target.value)} placeholder="0" />
                            {errors.price && <p className="text-xs text-destructive">{errors.price}</p>}
                        </div>
                        <div className="space-y-1">
                            <Label>Weight (grams) *</Label>
                            <Input type="number" min="0" value={data.weight} onChange={e => setData('weight', e.target.value)} placeholder="0" />
                            {errors.weight && <p className="text-xs text-destructive">{errors.weight}</p>}
                        </div>
                        <div className="space-y-1 col-span-2">
                            <Label>Quantity / Stock *</Label>
                            <Input type="number" min="0" value={data.quantity} onChange={e => setData('quantity', e.target.value)} placeholder="0" />
                            {errors.quantity && <p className="text-xs text-destructive">{errors.quantity}</p>}
                        </div>
                    </div>

                    <div className="space-y-1">
                        <Label>Colors <span className="text-muted-foreground text-xs">(comma separated)</span></Label>
                        <Input value={data.colors} onChange={e => setData('colors', e.target.value)} placeholder="e.g. RED, BLUE, WHITE, BLACK" />
                        <p className="text-xs text-muted-foreground">Separate each color with a comma</p>
                        {errors.colors && <p className="text-xs text-destructive">{errors.colors}</p>}
                    </div>

                    <div className="space-y-1">
                        <Label>Sizes <span className="text-muted-foreground text-xs">(comma separated)</span></Label>
                        <Input value={data.sizes} onChange={e => setData('sizes', e.target.value)} placeholder="e.g. S, M, L, XL, 2XL" />
                        <p className="text-xs text-muted-foreground">Separate each size with a comma</p>
                        {errors.sizes && <p className="text-xs text-destructive">{errors.sizes}</p>}
                    </div>

                    {/* Promo exclusion toggle */}
                    <div className={`rounded-lg border p-4 space-y-1 transition-colors ${
                        data.exclude_from_promo
                            ? 'border-orange-300 bg-orange-50'
                            : 'border-border bg-muted/30'
                    }`}>
                        <div className="flex items-center justify-between">
                            <div>
                                <Label className="text-sm font-medium">Exclude from Promo</Label>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                    This product will not receive any discount or shipping fee reduction from promo rules.
                                    {data.code.trim().toUpperCase().endsWith('Z') && (
                                        <span className="ml-1 text-orange-600 font-medium">
                                            Auto-detected: code ends with Z.
                                        </span>
                                    )}
                                </p>
                            </div>
                            <button
                                type="button"
                                role="switch"
                                aria-checked={data.exclude_from_promo}
                                onClick={() => setData('exclude_from_promo', !data.exclude_from_promo)}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-orange-400 focus:ring-offset-2 ${
                                    data.exclude_from_promo ? 'bg-orange-500' : 'bg-muted-foreground/30'
                                }`}
                            >
                                <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                                    data.exclude_from_promo ? 'translate-x-6' : 'translate-x-1'
                                }`} />
                            </button>
                        </div>
                    </div>

                    <Button type="submit" disabled={processing}>Save Product</Button>
                </form>
            </div>
        </>
    );
}

ProductCreate.layout = (page: any) => page;