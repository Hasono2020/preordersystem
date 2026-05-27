import { Head, useForm, Link } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function PromoRuleEdit({ rule }: any) {
    const { data, setData, patch, processing, errors } = useForm({
        label:             rule.label,
        customer_type:     rule.customer_type,
        min_items:         rule.min_items,
        discount_flat:     rule.discount_flat,
        discount_per_item: rule.discount_per_item,
        free_shipping_max: rule.free_shipping_max,
        is_active:         rule.is_active,
    });

    function submit(e: React.FormEvent) {
        e.preventDefault();
        patch(`/promo-rules/${rule.id}`);
    }

    return (
        <>
            <Head title="Edit Promo Rule" />
            <div className="p-6 max-w-2xl space-y-6">
                <div className="flex items-center gap-3">
                    <Link href="/promo-rules" className="text-muted-foreground hover:text-foreground text-sm">← Back</Link>
                    <h1 className="text-xl font-semibold">Edit Promo Rule</h1>
                </div>

                <form onSubmit={submit} className="space-y-5">
                    <div className="space-y-1">
                        <Label>Label *</Label>
                        <Input value={data.label} onChange={e => setData('label', e.target.value)} />
                        {errors.label && <p className="text-xs text-destructive">{errors.label}</p>}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <Label>Applies To *</Label>
                            <select className="w-full rounded-md border px-3 py-2 text-sm bg-background"
                                value={data.customer_type} onChange={e => setData('customer_type', e.target.value)}>
                                <option value="all">All Customers</option>
                                <option value="normal">Normal Customers Only</option>
                                <option value="reseller">Resellers Only</option>
                            </select>
                        </div>
                        <div className="space-y-1">
                            <Label>Minimum Items *</Label>
                            <Input type="number" min={1} value={data.min_items}
                                onChange={e => setData('min_items', parseInt(e.target.value) || 1)} />
                            {errors.min_items && <p className="text-xs text-destructive">{errors.min_items}</p>}
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-1">
                            <Label>Flat Discount (Rp)</Label>
                            <Input type="number" min={0} value={data.discount_flat}
                                onChange={e => setData('discount_flat', parseInt(e.target.value) || 0)} />
                            <p className="text-xs text-muted-foreground">Fixed amount off the order</p>
                        </div>
                        <div className="space-y-1">
                            <Label>Per-item Discount (Rp)</Label>
                            <Input type="number" min={0} value={data.discount_per_item}
                                onChange={e => setData('discount_per_item', parseInt(e.target.value) || 0)} />
                            <p className="text-xs text-muted-foreground">Amount × total items</p>
                        </div>
                        <div className="space-y-1">
                            <Label>Free Shipping Max (Rp)</Label>
                            <Input type="number" min={0} value={data.free_shipping_max}
                                onChange={e => setData('free_shipping_max', parseInt(e.target.value) || 0)} />
                            <p className="text-xs text-muted-foreground">Cap on free shipping applied</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <input id="is_active" type="checkbox" checked={data.is_active}
                            onChange={e => setData('is_active', e.target.checked)} className="rounded" />
                        <Label htmlFor="is_active">Active</Label>
                    </div>

                    <div className="flex gap-3 pt-2">
                        <Button type="submit" disabled={processing}>Save Changes</Button>
                        <Link href="/promo-rules"><Button type="button" variant="outline">Cancel</Button></Link>
                    </div>
                </form>
            </div>
        </>
    );
}