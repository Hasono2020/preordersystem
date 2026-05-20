import { Head, useForm, Link } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function UserEdit({ user }: any) {
    const { data, setData, patch, processing, errors } = useForm({
        name: user.name, email: user.email, role: user.role,
        password: '', password_confirmation: '',
    });

    function submit(e: React.FormEvent) {
        e.preventDefault();
        patch(`/users/${user.id}`);
    }

    return (
        <>
            <Head title="Edit User" />
            <div className="p-6 max-w-lg space-y-6">
                <div className="flex items-center gap-3">
                    <Link href="/users" className="text-muted-foreground hover:text-foreground text-sm">← Back</Link>
                    <h1 className="text-xl font-semibold">Edit User</h1>
                </div>

                <form onSubmit={submit} className="space-y-4">
                    <div className="space-y-1">
                        <Label>Name *</Label>
                        <Input value={data.name} onChange={e => setData('name', e.target.value)} />
                        {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
                    </div>
                    <div className="space-y-1">
                        <Label>Email *</Label>
                        <Input type="email" value={data.email} onChange={e => setData('email', e.target.value)} />
                        {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
                    </div>
                    <div className="space-y-1">
                        <Label>Role *</Label>
                        <select
                            className="w-full rounded-md border px-3 py-2 text-sm bg-background"
                            value={data.role}
                            onChange={e => setData('role', e.target.value)}
                        >
                            <option value="staff">Staff</option>
                            <option value="admin">Admin</option>
                        </select>
                        {errors.role && <p className="text-xs text-destructive">{errors.role}</p>}
                    </div>
                    <div className="space-y-1">
                        <Label>New Password <span className="text-muted-foreground text-xs">(leave blank to keep current)</span></Label>
                        <Input type="password" value={data.password} onChange={e => setData('password', e.target.value)} />
                        {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
                    </div>
                    <div className="space-y-1">
                        <Label>Confirm New Password</Label>
                        <Input type="password" value={data.password_confirmation} onChange={e => setData('password_confirmation', e.target.value)} />
                    </div>
                    <Button type="submit" disabled={processing}>Update User</Button>
                </form>
            </div>
        </>
    );
}

UserEdit.layout = (page: any) => page;