import { Head, useForm, Link } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function CustomerEdit({ customer }: any) {
    const { data, setData, patch, processing, errors } = useForm({
        name: customer.name, phone: customer.phone ?? '', address: customer.address ?? '',
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
                    <Button type="submit" disabled={processing}>Update Customer</Button>
                </form>
            </div>
        </>
    );
}

CustomerEdit.layout = (page: any) => page;