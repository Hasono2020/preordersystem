import { Head, useForm, Link } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function ShippingAreaCreate() {
    const { data, setData, post, processing, errors } = useForm({
        name: '', price_per_kg: '',
    });

    function submit(e: React.FormEvent) {
        e.preventDefault();
        post('/shipping-areas');
    }

    return (
        <>
            <Head title="Add Shipping Area" />
            <div className="p-6 max-w-lg space-y-6">
                <div className="flex items-center gap-3">
                    <Link href="/shipping-areas" className="text-muted-foreground hover:text-foreground text-sm">← Back</Link>
                    <h1 className="text-xl font-semibold">Add Shipping Area</h1>
                </div>

                <form onSubmit={submit} className="space-y-4">
                    <div className="space-y-1">
                        <Label>Area Name *</Label>
                        <Input value={data.name} onChange={e => setData('name', e.target.value)} placeholder="e.g. Downtown, North Zone" />
                        {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
                    </div>
                    <div className="space-y-1">
                        <Label>Price per kg *</Label>
                        <Input type="number" min="0" value={data.price_per_kg} onChange={e => setData('price_per_kg', e.target.value)} placeholder="0" />
                        {errors.price_per_kg && <p className="text-xs text-destructive">{errors.price_per_kg}</p>}
                    </div>
                    <Button type="submit" disabled={processing}>Save Area</Button>
                </form>
            </div>
        </>
    );
}

ShippingAreaCreate.layout = (page: any) => page;