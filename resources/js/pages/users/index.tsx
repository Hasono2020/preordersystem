import { Head, Link, router, usePage } from '@inertiajs/react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function UsersIndex({ users }: any) {
    const { flash } = usePage().props as any;

    function destroy(id: number) {
        if (confirm('Delete this user?')) {
            router.delete(`/users/${id}`);
        }
    }

    return (
        <>
            <Head title="Users" />
            <div className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold">Users</h1>
                        <p className="text-sm text-muted-foreground mt-0.5">Manage staff and admin accounts.</p>
                    </div>
                    <Link href="/users/create">
                        <Button size="sm"><Plus className="size-4 mr-1" /> Add User</Button>
                    </Link>
                </div>

                {flash?.success && (
                    <div className="rounded-md bg-green-50 border border-green-200 px-4 py-2 text-sm text-green-800">
                        {flash.success}
                    </div>
                )}
                {flash?.error && (
                    <div className="rounded-md bg-red-50 border border-red-200 px-4 py-2 text-sm text-red-800">
                        {flash.error}
                    </div>
                )}

                <div className="rounded-2xl border shadow-sm overflow-hidden">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="text-xs text-muted-foreground uppercase tracking-wide border-b bg-muted/30">
                                <th className="text-left px-6 py-3">Name</th>
                                <th className="text-left px-6 py-3">Email</th>
                                <th className="text-left px-6 py-3">Role</th>
                                <th className="text-left px-6 py-3">Created</th>
                                <th className="px-6 py-3"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {/* FIX 4: users is now paginated so we use users.data */}
                            {users.data.map((u: any, idx: number) => (
                                <tr key={u.id}
                                    className={`border-b last:border-0 hover:bg-muted/30 transition-colors ${idx % 2 === 0 ? '' : 'bg-muted/10'}`}>
                                    <td className="px-6 py-3.5 font-medium">{u.name}</td>
                                    <td className="px-6 py-3.5 text-muted-foreground">{u.email}</td>
                                    <td className="px-6 py-3.5">
                                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                                            u.role === 'admin'
                                                ? 'bg-purple-100 text-purple-700'
                                                : 'bg-sky-100 text-sky-700'
                                        }`}>
                                            {u.role === 'admin' ? 'Admin' : 'Staff'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-3.5 text-muted-foreground">
                                        {new Date(u.created_at).toLocaleDateString('en-GB', {
                                            day: '2-digit', month: 'short', year: 'numeric'
                                        })}
                                    </td>
                                    <td className="px-6 py-3.5 flex gap-2 justify-end">
                                        <Link href={`/users/${u.id}/edit`}>
                                            <Button variant="ghost" size="icon"><Pencil className="size-4" /></Button>
                                        </Link>
                                        <Button variant="ghost" size="icon" onClick={() => destroy(u.id)}>
                                            <Trash2 className="size-4 text-destructive" />
                                        </Button>
                                    </td>
                                </tr>
                            ))}
                            {users.data.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
                                        No users yet.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination — only shown when there's more than one page */}
                {users.links.length > 3 && (
                    <div className="flex gap-2 justify-end text-sm">
                        {users.links.map((link: any, i: number) => (
                            <Link key={i} href={link.url ?? '#'}
                                className={`px-3 py-1 rounded border ${link.active ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'} ${!link.url ? 'opacity-40 pointer-events-none' : ''}`}
                                dangerouslySetInnerHTML={{ __html: link.label }}
                            />
                        ))}
                    </div>
                )}
            </div>
        </>
    );
}

UsersIndex.layout = (page: any) => page;