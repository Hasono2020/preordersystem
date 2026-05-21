import { Head, useForm, Link } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function ShippingAreaEdit({ shippingArea }: any) {
    const { data, setData, patch, processing, errors } = useForm({
        name:         shippingArea.name,
        price_per_kg: String(shippingArea.price_per_kg),
    });

    function submit(e: React.FormEvent) {
        e.preventDefault();
        patch(`/shipping-areas/${shippingArea.id}`);
    }

    return (
        <>
            <Head title="Edit Shipping Area" />
            <div className="p-6 max-w-lg space-y-6">
                <div className="flex items-center gap-3">
                    <Link href="/shipping-areas" className="text-muted-foreground hover:text-foreground text-sm">← Back</Link>
                    <h1 className="text-xl font-semibold">Edit Shipping Area</h1>
                </div>

                <form onSubmit={submit} className="space-y-4">
                    <div className="space-y-1">
                        <Label>Area Name *</Label>
                        <Input value={data.name} onChange={e => setData('name', e.target.value)} />
                        {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
                    </div>
                    <div className="space-y-1">
                        <Label>Price per kg *</Label>
                        <Input type="number" min="0" value={data.price_per_kg} onChange={e => setData('price_per_kg', e.target.value)} />
                        {errors.price_per_kg && <p className="text-xs text-destructive">{errors.price_per_kg}</p>}
                    </div>
                    <Button type="submit" disabled={processing}>Update Area</Button>
                </form>
            </div>
        </>
    );
}

ShippingAreaEdit.layout = (page: any) => page;