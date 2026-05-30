import { Head, useForm, Link } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function TripCreate() {
    const { data, setData, post, processing, errors } = useForm({
        name: '', location: '', start_date: '', end_date: '', notes: '',
    });

    function submit(e: React.FormEvent) {
        e.preventDefault();
        post('/trips');
    }

    return (
        <>
            <Head title="New Trip" />
            <div className="p-6 max-w-lg space-y-6">
                <div className="flex items-center gap-3">
                    <Link href="/trips" className="text-muted-foreground hover:text-foreground text-sm">← Back</Link>
                    <h1 className="text-xl font-semibold">New Trip</h1>
                </div>
                <form onSubmit={submit} className="space-y-4">
                    <div className="space-y-1">
                        <Label>Trip Name *</Label>
                        <Input value={data.name} onChange={e => setData('name', e.target.value)} placeholder="e.g. China Trip May 2026" />
                        {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
                    </div>
                    <div className="space-y-1">
                        <Label>Location</Label>
                        <Input value={data.location} onChange={e => setData('location', e.target.value)} placeholder="e.g. Guangzhou, China" />
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
                        <Label>Notes</Label>
                        <textarea className="w-full rounded-md border px-3 py-2 text-sm bg-background" rows={3}
                            value={data.notes} onChange={e => setData('notes', e.target.value)} />
                    </div>
                    <Button type="submit" disabled={processing}>Create Trip</Button>
                </form>
            </div>
        </>
    );
}

TripCreate.layout = (page: any) => page;