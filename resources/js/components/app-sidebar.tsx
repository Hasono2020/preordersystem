import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar';
import { type NavItem } from '@/types';
import { Link, usePage } from '@inertiajs/react';
import { LayoutGrid, ShoppingCart, BarChart2, UserCog, MapPin, Package, Upload, Tag, ClipboardList, Plane } from 'lucide-react';

const getNavItems = (isAdmin: boolean): NavItem[] => {
    const items: NavItem[] = [
        { title: 'Dashboard',       href: '/dashboard',      icon: LayoutGrid },
        { title: 'Orders',          href: '/orders',         icon: ShoppingCart },
        { title: 'Products',        href: '/products',       icon: Package },
        { title: 'Shipping Areas',  href: '/shipping-areas', icon: MapPin },
        { title: 'Import / Export', href: '/import-export',  icon: Upload },
        { title: 'Summary',         href: '/summary',        icon: ClipboardList },
        { title: 'Trips',           href: '/trips',          icon: Plane },
    ];
    if (isAdmin) {
        items.push({ title: 'Reports',     href: '/reports',     icon: BarChart2 });
        items.push({ title: 'Users',       href: '/users',       icon: UserCog });
        items.push({ title: 'Promo Rules', href: '/promo-rules', icon: Tag });
    }
    return items;
};

export function AppSidebar() {
    const { auth } = usePage().props as any;
    const navItems = getNavItems(auth.user?.role === 'admin');

    return (
        <Sidebar collapsible="icon" variant="inset">
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <Link href="/dashboard">
                                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                                    <ShoppingCart className="size-4" />
                                </div>
                                <div className="grid flex-1 text-left text-sm leading-tight">
                                    <span className="truncate font-semibold">Sales System</span>
                                    <span className="truncate text-xs capitalize">{auth.user?.role}</span>
                                </div>
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>
            <SidebarContent>
                <NavMain items={navItems} />
            </SidebarContent>
            <SidebarFooter>
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}