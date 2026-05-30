import { Head, Link, router, usePage } from '@inertiajs/react';
import { Plus, Eye, Pencil, Trash2, CheckCircle, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function TripsIndex({ trips }: any) {
    const { flash } = usePage().props as any;

    function destroy(id: number) {
        if (confirm('Delete this trip?')) router.delete(`/trips/${id}`);
    }

    return (
        <>
            <Head title="Trips" />
            <div className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold">Trips</h1>
                        <p className="text-sm text-muted-foreground mt-0.5">Manage your overseas buying sessions.</p>
                    </div>
                    <Link href="/trips/create">
                        <Button size="sm"><Plus className="size-4 mr-1" /> New Trip</Button>
                    </Link>
                </div>

                {flash?.success && (
                    <div className="rounded-md bg-green-50 border border-green-200 px-4 py-2 text-sm text-green-800">
                        {flash.success}
                    </div>
                )}

                <div className="rounded-2xl border shadow-sm overflow-hidden">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="text-xs text-muted-foreground uppercase tracking-wide border-b bg-muted/30">
                                <th className="text-left px-6 py-3">Trip</th>
                                <th className="text-left px-6 py-3">Location</th>
                                <th className="text-left px-6 py-3">Date</th>
                                <th className="text-left px-6 py-3">Status</th>
                                <th className="text-right px-6 py-3">Orders</th>
                                <th className="px-6 py-3"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {trips.map((trip: any, idx: number) => (
                                <tr key={trip.id}
                                    className={`border-b last:border-0 hover:bg-muted/30 transition-colors ${idx % 2 === 0 ? '' : 'bg-muted/10'}`}>
                                    <td className="px-6 py-3.5 font-semibold">{trip.name}</td>
                                    <td className="px-6 py-3.5 text-muted-foreground">{trip.location ?? '—'}</td>
                                    <td className="px-6 py-3.5 text-muted-foreground text-xs">
                                        {trip.start_date ? new Date(trip.start_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                                        {trip.end_date ? ` → ${new Date(trip.end_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}` : ''}
                                    </td>
                                    <td className="px-6 py-3.5">
                                        {trip.status === 'active' ? (
                                            <span className="flex items-center gap-1 text-green-600 text-xs font-medium">
                                                <Clock className="size-3" /> Active
                                            </span>
                                        ) : (
                                            <span className="flex items-center gap-1 text-muted-foreground text-xs font-medium">
                                                <CheckCircle className="size-3" /> Closed
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-6 py-3.5 text-right font-medium">{trip.orders_count}</td>
                                    <td className="px-6 py-3.5 flex gap-2 justify-end">
                                        <Link href={`/trips/${trip.id}`}>
                                            <Button variant="ghost" size="icon"><Eye className="size-4" /></Button>
                                        </Link>
                                        <Link href={`/trips/${trip.id}/edit`}>
                                            <Button variant="ghost" size="icon"><Pencil className="size-4" /></Button>
                                        </Link>
                                        <Button variant="ghost" size="icon" onClick={() => destroy(trip.id)}>
                                            <Trash2 className="size-4 text-destructive" />
                                        </Button>
                                    </td>
                                </tr>
                            ))}
                            {trips.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">
                                        No trips yet. <Link href="/trips/create" className="text-primary hover:underline">Create one →</Link>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </>
    );
}

TripsIndex.layout = (page: any) => page;