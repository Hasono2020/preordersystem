import { Head, useForm, Link } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function ProductEdit({ product }: any) {
    const { data, setData, patch, processing, errors } = useForm({
        code:     product.code,
        name:     product.name,
        price:    String(product.price),
        weight:   String(product.weight),
        quantity: String(product.quantity ?? 0),
        colors:   (product.colors ?? []).join(', '),
        sizes:    (product.sizes ?? []).join(', '),
    });

    function submit(e: React.FormEvent) {
        e.preventDefault();
        patch(`/products/${product.id}`);
    }

    return (
        <>
            <Head title="Edit Product" />
            <div className="p-6 max-w-lg space-y-6">
                <div className="flex items-center gap-3">
                    <Link href="/products" className="text-muted-foreground hover:text-foreground text-sm">← Back</Link>
                    <h1 className="text-xl font-semibold">Edit Product</h1>
                </div>

                <form onSubmit={submit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <Label>Product Code *</Label>
                            <Input value={data.code} onChange={e => setData('code', e.target.value)} className="font-mono" />
                            {errors.code && <p className="text-xs text-destructive">{errors.code}</p>}
                        </div>
                        <div className="space-y-1">
                            <Label>Product Name *</Label>
                            <Input value={data.name} onChange={e => setData('name', e.target.value)} />
                            {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
                        </div>
                        <div className="space-y-1">
                            <Label>Price *</Label>
                            <Input type="number" min="0" value={data.price} onChange={e => setData('price', e.target.value)} />
                            {errors.price && <p className="text-xs text-destructive">{errors.price}</p>}
                        </div>
                        <div className="space-y-1">
                            <Label>Weight (grams) *</Label>
                            <Input type="number" min="0" value={data.weight} onChange={e => setData('weight', e.target.value)} />
                            {errors.weight && <p className="text-xs text-destructive">{errors.weight}</p>}
                        </div>
                        <div className="space-y-1 col-span-2">
                            <Label>Quantity / Stock *</Label>
                            <Input type="number" min="0" value={data.quantity} onChange={e => setData('quantity', e.target.value)} />
                            {errors.quantity && <p className="text-xs text-destructive">{errors.quantity}</p>}
                        </div>
                    </div>
                    <div className="space-y-1">
                        <Label>Colors <span className="text-muted-foreground text-xs">(comma separated)</span></Label>
                        <Input value={data.colors} onChange={e => setData('colors', e.target.value)} />
                        <p className="text-xs text-muted-foreground">Separate each color with a comma</p>
                    </div>
                    <div className="space-y-1">
                        <Label>Sizes <span className="text-muted-foreground text-xs">(comma separated)</span></Label>
                        <Input value={data.sizes} onChange={e => setData('sizes', e.target.value)} />
                        <p className="text-xs text-muted-foreground">Separate each size with a comma</p>
                    </div>
                    <Button type="submit" disabled={processing}>Update Product</Button>
                </form>
            </div>
        </>
    );
}

ProductEdit.layout = (page: any) => page;