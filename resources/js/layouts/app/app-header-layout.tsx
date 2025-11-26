import { AppContent } from '@/components/app-content';
import { AppShell } from '@/components/app-shell';
import Logo from '@/components/navbar-components/logo';
import UserMenu from '@/components/navbar-components/user-menu';
import { Toaster } from "@/components/ui/sonner"
import { Button } from '@/components/ui/button'
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
import { Link, router, usePage } from '@inertiajs/react';
import { setUrlDefaults } from '@/wayfinder';
import { shopMenu as shopMenuRoute } from '@/routes/shops'
import { LayoutGrid } from 'lucide-react'

export default function AppHeaderLayout(
    props: PropsWithChildren<{ breadcrumbs?: TBreadcrumbItem[]; contentFullWidth?: boolean; contentClassName?: string; hideSecondaryNav?: boolean }>,
) {
    const { children, contentFullWidth, contentClassName } = props as PropsWithChildren<{ breadcrumbs?: TBreadcrumbItem[]; contentFullWidth?: boolean; contentClassName?: string; hideSecondaryNav?: boolean }>;
    const { props: pageProps } = usePage<{ auth?: { shops?: Array<{ id: number | string; name: string }>; user?: { roles?: string[] } } }>();
    const shops = pageProps.auth?.shops ?? [];
    const firstId = shops.length > 0 ? String(shops[0].id) : undefined;
    const roles = pageProps.auth?.user?.roles ?? [];
    const isSuper = roles.includes('Super admin');
    const isAdmin = roles.includes('admin');
    const isVendeur = roles.includes('vendeur');

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
    const logoHref = (() => {
        if (isSuper) {
            return '/home-menu';
        }
        if (isAdmin || isVendeur) {
            const sid = currentShopId ?? firstId;
            return sid ? `/shops/${sid}/shop-menu` : '/';
        }
        return '/';
    })();

    return (
        <AppShell>
            <header className="border-b px-18 sm:px-20 md:px-24 lg:px-28">
                <div className="flex h-16 items-center justify-between gap-3 md:gap-4">
                    {/* Left side */}
                    <div className="flex items-center gap-2">
                        <Breadcrumb>
                            <BreadcrumbList>
                                <BreadcrumbItem>
                                    <Link href={logoHref} className="text-foreground" prefetch>
                                        <Logo />
                                    </Link>
                                </BreadcrumbItem>
                                <BreadcrumbSeparator> / </BreadcrumbSeparator>
                                {/* On mobile and tablet, show a compact dropdown. Show full crumb text on large screens. */}
                                <BreadcrumbItem className="lg:hidden">
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
                                <BreadcrumbItem className="hidden lg:inline-flex">
                                    <BreadcrumbLink href="#">Liste des boutiques</BreadcrumbLink>
                                    </BreadcrumbItem>
                                <BreadcrumbSeparator> / </BreadcrumbSeparator>
                                <BreadcrumbItem>
                                    <Select key={selectValue} value={selectValue} onValueChange={handleShopChange} disabled={shops.length === 0}>
                                        <SelectTrigger aria-label="Selectionnez la boutique" className="h-8 px-1.5 md:px-2 text-foreground">
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
                        {/* Quick admin links (Super admin only) */}
                        <HeaderAdminLinks />
                        {/* Accès direct au menu de la boutique (tous rôles) */}
                        {selectValue && (
                            <Button asChild size="sm" variant="default">
                                <Link
                                    href={shopMenuRoute.url({ shop: selectValue })}
                                    prefetch
                                    aria-label="Menu Boutique"
                                >
                                    <LayoutGrid className="h-4 w-4" />
                                    <span className="ml-2 hidden md:inline">Menu Boutique</span>
                                </Link>
                            </Button>
                        )}
                        {/* User menu */}
                        <UserMenu />
                    </div>
                </div>
            </header>
            {/* Secondary navigation supprimée selon refactor */}
            <AppContent fullWidth={contentFullWidth} className={contentClassName}>{children}</AppContent>
            <Toaster />
        </AppShell>
    );
}

function HeaderAdminLinks() {
    const { props } = usePage<{ auth?: { user?: { roles?: string[] } } }>();
    const roles = props.auth?.user?.roles ?? [];
    const isSuper = roles.includes('Super admin');
    if (!isSuper) {
        return null;
    }
    return (
        // Hide admin quick links on tablet and below to improve header responsiveness
        <nav className="flex items-center gap-3 max-md:hidden">
            <Link href="/admin/users" className="text-sm text-muted-foreground hover:text-foreground">
                Accès utilisateurs
            </Link>
            <span className="text-muted-foreground/50">|</span>
            <Link href="/admin/shops" className="text-sm text-muted-foreground hover:text-foreground">
                Gestion boutique
            </Link>
        </nav>
    );
}
