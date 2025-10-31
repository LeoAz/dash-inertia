import { AppContent } from '@/components/app-content';
import { AppShell } from '@/components/app-shell';
import Logo from '@/components/navbar-components/logo';
import NotificationMenu from '@/components/navbar-components/notification-menu';
import UserMenu from '@/components/navbar-components/user-menu';
import { Toaster } from "@/components/ui/sonner"
import SecondaryNav from '@/components/secondary-nav';
import {
    Breadcrumb,
    BreadcrumbEllipsis,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import type { BreadcrumbItem as TBreadcrumbItem } from '@/types';
import type { PropsWithChildren } from 'react';
import { router, usePage } from '@inertiajs/react';
import { setUrlDefaults } from '@/wayfinder';

export default function AppHeaderLayout(
    props: PropsWithChildren<{ breadcrumbs?: TBreadcrumbItem[]; contentFullWidth?: boolean; contentClassName?: string }>,
) {
    const { children, contentFullWidth, contentClassName } = props as PropsWithChildren<{ breadcrumbs?: TBreadcrumbItem[]; contentFullWidth?: boolean; contentClassName?: string }>;
    const { props: pageProps } = usePage<{ auth?: { shops?: Array<{ id: number | string; name: string }> } }>();
    const shops = pageProps.auth?.shops ?? [];
    const firstId = shops.length > 0 ? String(shops[0].id) : undefined;

    const currentShopId = (() => {
        if (typeof window !== 'undefined') {
            const match = window.location.pathname.match(/\/shops\/(\d+|[^/]+)/);
            if (match) {
                return String(match[1]);
            }
        }
        return firstId;
    })();

    const handleShopChange = (newShopId: string): void => {
        if (typeof window === 'undefined') {
            return;
        }
        const { pathname, search, hash } = window.location;
        const hasShopSegment = /\/shops\/[^/]+/.test(pathname);
        const nextPath = hasShopSegment ? pathname.replace(/\/shops\/[^/]+/, `/shops/${newShopId}`) : `/shops/${newShopId}/products`;

        setUrlDefaults({ shop: newShopId });
        // Force a fresh render of the page/layout so the header Select updates immediately
        router.visit(`${nextPath}${search}${hash}`, { preserveScroll: true, preserveState: false });
    };

    const selectValue = currentShopId ?? firstId;

    return (
        <AppShell>
            <header className="border-b px-26 md:px-28">
                <div className="flex h-16 items-center justify-between gap-4">
                    {/* Left side */}
                    <div className="flex items-center gap-2">
                        <Breadcrumb>
                            <BreadcrumbList>
                                <BreadcrumbItem>
                                    <BreadcrumbLink href="#" className="text-foreground">
                                        <Logo />
                                    </BreadcrumbLink>
                                </BreadcrumbItem>
                                <BreadcrumbSeparator> / </BreadcrumbSeparator>
                                <BreadcrumbItem className="md:hidden">
                                    <DropdownMenu>
                                        <DropdownMenuTrigger className="hover:text-foreground">
                                            <BreadcrumbEllipsis />
                                            <span className="sr-only">Toggle menu</span>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="start">
                                            <DropdownMenuItem asChild>
                                                <a href="#">Liste des boutiques</a>
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </BreadcrumbItem>
                                <BreadcrumbItem className="max-md:hidden">
                                    <BreadcrumbLink href="#">Liste des boutiques</BreadcrumbLink>
                                </BreadcrumbItem>
                                <BreadcrumbSeparator> / </BreadcrumbSeparator>
                                <BreadcrumbItem>
                                    <Select key={selectValue} value={selectValue} onValueChange={handleShopChange} disabled={shops.length === 0}>
                                        <SelectTrigger aria-label="Selectionnez la boutique" className="h-8 px-1.5 text-foreground">
                                            <SelectValue placeholder="Selectionnez la boutique" />
                                        </SelectTrigger>
                                        <SelectContent className="[&_*[role=option]]:ps-2 [&_*[role=option]]:pe-8 [&_*[role=option]>span]:start-auto [&_*[role=option]>span]:end-2">
                                            {shops.map((shop) => (
                                                <SelectItem key={shop.id} value={String(shop.id)}>
                                                    {shop.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </BreadcrumbItem>
                            </BreadcrumbList>
                        </Breadcrumb>
                    </div>
                    {/* Right side */}
                    <div className="flex items-center gap-4">
                        {/* Notification */}
                        <NotificationMenu />
                        {/* User menu */}
                        <UserMenu />
                    </div>
                </div>
            </header>
            <SecondaryNav />
            <AppContent fullWidth={contentFullWidth} className={contentClassName}>{children}</AppContent>
            <Toaster />
        </AppShell>
    );
}
