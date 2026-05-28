import { Head, useForm, Link } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function CustomerEdit({ customer, areas }: any) {
    const { data, setData, patch, processing, errors } = useForm({
        name:    customer.name,
        phone:   customer.phone ?? '',
        address: customer.address ?? '',
        area_id: customer.area_id ? String(customer.area_id) : '',
        type:       customer.type       ?? 'normal',
        promo_type: customer.promo_type ?? 'default',
    });

    function submit(e: React.FormEvent) {
        e.preventDefault();
        patch(`/customers/${customer.id}`);
    }

    return (
        <>
            <Head title="Edit Customer" />
            <div className="p-6 max-w-lg space-y-6">
                <div className="flex items-center gap-3">
                    <Link href="/customers" className="text-muted-foreground hover:text-foreground text-sm">← Back</Link>
                    <h1 className="text-xl font-semibold">Edit Customer</h1>
                </div>

                <form onSubmit={submit} className="space-y-4">
                    <div className="space-y-1">
                        <Label>Name *</Label>
                        <Input value={data.name} onChange={e => setData('name', e.target.value)} />
                        {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
                    </div>
                    <div className="space-y-1">
                        <Label>Phone</Label>
                        <Input value={data.phone} onChange={e => setData('phone', e.target.value)} />
                    </div>
                    <div className="space-y-1">
                        <Label>Address</Label>
                        <textarea
                            className="w-full rounded-md border px-3 py-2 text-sm bg-background"
                            rows={3}
                            value={data.address}
                            onChange={e => setData('address', e.target.value)}
                        />
                    </div>
                    <div className="space-y-1">
                        <Label>Shipping Area</Label>
                        <select
                            className="w-full rounded-md border px-3 py-2 text-sm bg-background"
                            value={data.area_id}
                            onChange={e => setData('area_id', e.target.value)}
                        >
                            <option value="">— No area selected —</option>
                            {areas.map((area: any) => (
                                <option key={area.id} value={area.id}>
                                    {area.name} — {Number(area.price_per_kg).toLocaleString()} / kg
                                </option>
                            ))}
                        </select>
                        {errors.area_id && <p className="text-xs text-destructive">{errors.area_id}</p>}
                    </div>
                    <div className="space-y-1">
                        <Label>Customer Type *</Label>
                        <select className="w-full rounded-md border px-3 py-2 text-sm bg-background"
                            value={data.type} onChange={e => setData('type', e.target.value)}>
                            <option value="normal">Normal Customer</option>
                            <option value="reseller">Reseller</option>
                        </select>
                        {errors.type && <p className="text-xs text-destructive">{errors.type}</p>}
                    </div>
                    <div className="space-y-1">
                        <Label>Promo Override</Label>
                        <select className="w-full rounded-md border px-3 py-2 text-sm bg-background"
                            value={data.promo_type} onChange={e => setData('promo_type', e.target.value)}>
                            <option value="default">Default (follow customer type)</option>
                            <option value="reseller_promo">Reseller Promo (gets reseller discounts)</option>
                        </select>
                        <p className="text-xs text-muted-foreground">
                            Set to "Reseller Promo" to give this customer reseller-level discounts regardless of their type.
                        </p>
                        {errors.promo_type && <p className="text-xs text-destructive">{errors.promo_type}</p>}
                    </div>
                    <Button type="submit" disabled={processing}>Update Customer</Button>
                </form>
            </div>
        </>
    );
}

CustomerEdit.layout = (page: any) => page;