import { Head, useForm, Link, router } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function TripEdit({ trip }: any) {
    const { data, setData, patch, processing, errors } = useForm({
        name:       trip.name,
        location:   trip.location ?? '',
        start_date: trip.start_date ?? '',
        end_date:   trip.end_date   ?? '',
        status:     trip.status,
        notes:      trip.notes ?? '',
    });

    function submit(e: React.FormEvent) {
        e.preventDefault();
        patch(`/trips/${trip.id}`);
    }

    function closeTrip() {
        if (confirm('Close this trip? You can still view it but no new orders can be assigned.')) {
            router.post(`/trips/${trip.id}/close`);
        }
    }

    return (
        <>
            <Head title="Edit Trip" />
            <div className="p-6 max-w-lg space-y-6">
                <div className="flex items-center gap-3">
                    <Link href={`/trips/${trip.id}`} className="text-muted-foreground hover:text-foreground text-sm">← Back</Link>
                    <h1 className="text-xl font-semibold">Edit Trip</h1>
                </div>
                <form onSubmit={submit} className="space-y-4">
                    <div className="space-y-1">
                        <Label>Trip Name *</Label>
                        <Input value={data.name} onChange={e => setData('name', e.target.value)} />
                        {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
                    </div>
                    <div className="space-y-1">
                        <Label>Location</Label>
                        <Input value={data.location} onChange={e => setData('location', e.target.value)} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <Label>Start Date</Label>
                            <Input type="date" value={data.start_date} onChange={e => setData('start_date', e.target.value)} />
                        </div>
                        <div className="space-y-1">
                            <Label>End Date</Label>
                            <Input type="date" value={data.end_date} onChange={e => setData('end_date', e.target.value)} />
                        </div>
                    </div>
                    <div className="space-y-1">
                        <Label>Status</Label>
                        <select className="w-full rounded-md border px-3 py-2 text-sm bg-background"
                            value={data.status} onChange={e => setData('status', e.target.value)}>
                            <option value="active">Active</option>
                            <option value="closed">Closed</option>
                        </select>
                    </div>
                    <div className="space-y-1">
                        <Label>Notes</Label>
                        <textarea className="w-full rounded-md border px-3 py-2 text-sm bg-background" rows={3}
                            value={data.notes} onChange={e => setData('notes', e.target.value)} />
                    </div>
                    <div className="flex gap-3">
                        <Button type="submit" disabled={processing}>Update Trip</Button>
                        {trip.status === 'active' && (
                            <Button type="button" variant="outline" onClick={closeTrip}>
                                Close Trip
                            </Button>
                        )}
                    </div>
                </form>
            </div>
        </>
    );
}

TripEdit.layout = (page: any) => page;