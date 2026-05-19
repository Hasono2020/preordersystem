import { useEffect } from 'react';
import { router, usePage } from '@inertiajs/react';
import { Head } from '@inertiajs/react';

export default function Welcome() {
    const { auth } = usePage().props as any;

    useEffect(() => {
        if (auth.user) {
            router.visit('/dashboard');
        } else {
            router.visit('/login');
        }
    }, []);

    return <Head title="Redirecting..." />;
}