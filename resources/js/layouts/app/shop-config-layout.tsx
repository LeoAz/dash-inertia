import AppHeaderLayout from '@/layouts/app/app-header-layout';
import { cn } from '@/lib/utils';
import { index as productsIndex } from '@/routes/shops/products';
import { index as servicesIndex } from '@/routes/shops/services';
import { index as hairdressersIndex } from '@/routes/shops/hairdressers';
import { index as promotionsIndex } from '@/routes/shops/promotions';
import { setUrlDefaults } from '@/wayfinder';
import { Link, usePage } from '@inertiajs/react';
import type { PropsWithChildren, ReactNode } from 'react';
import { useEffect, useMemo, useState } from 'react';
import Breadcrumbs from '@/components/breadcrumbs';
import { ToastProvider, ToastViewport, Toast, ToastTitle, ToastDescription, ToastClose } from '@/components/ui/toast';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';

type MenuItem = {
    key: string;
    label: string;
    href?: string;
    disabled?: boolean;
};

interface ShopConfigLayoutProps {
    breadcrumbs?: Array<{ title: string; href?: string }>;
    title?: ReactNode;
    shopId?: number | string;
}

export default function ShopConfigLayout({ children, breadcrumbs, title, shopId }: PropsWithChildren<ShopConfigLayoutProps>) {
    const page = usePage<{ shop?: { id: number | string }, auth?: { user?: { roles?: string[] } } }>();
    const { url, props } = page;

    // Roles for access control: only admin and Super admin see full shop config menu
    const roles: string[] = props?.auth?.user?.roles ?? [];
    const isAdminOrSuper = roles.includes('admin') || roles.includes('Super admin');

    const effectiveShopId = useMemo(() => {
        if (shopId !== undefined && shopId !== null) {
            return shopId;
        }
        // Try to infer from props sent by the page (e.g. Products index passes `shop`)
        const pageShop = props?.shop;
        if (pageShop && pageShop.id) {
            return pageShop.id;
        }
        // Fallback: try to parse `/shops/{id}/...`
        const match = typeof window !== 'undefined' ? window.location.pathname.match(/\/shops\/(\d+|[^/]+)/) : null;
        return match ? match[1] : undefined;
    }, [shopId, props]);

    useEffect(() => {
        if (effectiveShopId !== undefined) {
            setUrlDefaults({ shop: effectiveShopId as number | string });
        }
    }, [effectiveShopId]);

    const items: MenuItem[] = useMemo(() => {
        if (!isAdminOrSuper) {
            return [];
        }
        return [
            {
                key: 'products',
                label: 'Liste des produits',
                href: effectiveShopId !== undefined ? productsIndex.url({ shop: effectiveShopId as number | { id: number } }) : '#',
                disabled: effectiveShopId === undefined,
            },
            {
                key: 'services',
                label: 'Liste des services',
                href: effectiveShopId !== undefined ? servicesIndex.url({ shop: effectiveShopId as number | { id: number } }) : '#',
                disabled: effectiveShopId === undefined,
            },
            {
                key: 'hairdressers',
                label: 'Liste des coiffeurs',
                href: effectiveShopId !== undefined ? hairdressersIndex.url({ shop: effectiveShopId as number | { id: number } }) : '#',
                disabled: effectiveShopId === undefined,
            },
            {
                key: 'promotions',
                label: 'Liste des promotions',
                href: effectiveShopId !== undefined ? promotionsIndex.url({ shop: effectiveShopId as number | { id: number } }) : '#',
                disabled: effectiveShopId === undefined,
            },
        ];
    }, [effectiveShopId, isAdminOrSuper]);

    const pathname = typeof window !== 'undefined' ? window.location.pathname : url;

    const isActive = (item: MenuItem): boolean => {
        if (!item.href) {
            return false;
        }
        try {
            const u = new URL(item.href, typeof window !== 'undefined' ? window.location.origin : 'http://localhost');
            return pathname.startsWith(u.pathname);
        } catch {
            return false;
        }
    };

    return (
        <AppHeaderLayout contentFullWidth contentClassName="px-26 md:px-28 mt-5">
            <ToastHost />
            {/*
             * Sur tablette (<lg), on masque le menu de gauche et on laisse le contenu occuper toute la largeur.
             * Sur desktop (>=lg), on affiche un layout en 2 colonnes.
             */}
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-[220px_1fr] lg:gap-5">
                <aside className="hidden h-fit rounded-md bg-background p-2 lg:sticky lg:top-4 lg:block">
                    <nav className="flex flex-col">
                        {items.map((item) => (
                            <NavItem key={item.key} active={isActive(item)} disabled={item.disabled} href={item.href}>
                                {item.label}
                            </NavItem>
                        ))}
                    </nav>
                </aside>
                <section className="min-h-[60vh] rounded-md bg-background p-2 md:p-3">
                    {/* Bouton menu mobile pour afficher le menu masqué (<lg) */}
                    <div className="mb-2 flex items-center justify-between lg:hidden">
                        <div className="min-w-0">
                            {breadcrumbs && breadcrumbs.length > 0 ? (
                                <Breadcrumbs items={breadcrumbs} />
                            ) : null}
                        </div>
                        <MobileMenu items={items} isActive={isActive} />
                    </div>
                    {breadcrumbs && breadcrumbs.length > 0 && (
                        <div className="mb-2 hidden md:mb-3 lg:block">
                            <Breadcrumbs items={breadcrumbs} />
                        </div>
                    )}
                    {title && <h1 className="mb-2 text-base font-semibold md:mb-3 md:text-xl">{title}</h1>}
                    <div className="overflow-x-auto">
                        {children}
                    </div>
                </section>
            </div>
        </AppHeaderLayout>
    );
}

function NavItem({ href, children, active, disabled }: PropsWithChildren<{ href?: string; active?: boolean; disabled?: boolean }>) {
    const className = cn(
        'rounded-sm px-3 py-2 text-sm transition-colors',
        active ? 'bg-muted font-medium text-foreground' : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
        disabled && 'pointer-events-none opacity-50',
    );

    if (!href || disabled) {
        return <span className={className}>{children}</span>;
    }

    return (
        <Link href={href} className={className} preserveScroll>
            {children}
        </Link>
    );
}

function MobileMenu({ items, isActive }: { items: MenuItem[]; isActive: (item: MenuItem) => boolean }) {
    const [open, setOpen] = useState(false);
    return (
        <>
            <Button type="button" variant="outline" size="sm" className="lg:hidden" onClick={() => setOpen(true)} aria-label="Ouvrir le menu">
                Menu
            </Button>
            <Sheet open={open} onOpenChange={setOpen}>
                <SheetContent side="left" className="w-[86vw] sm:w-[380px] p-0">
                    <SheetHeader className="border-b px-4 py-3">
                        <SheetTitle>Menu</SheetTitle>
                    </SheetHeader>
                    <nav className="flex flex-col gap-1 p-2">
                        {items.map((item) => (
                            <NavItem key={item.key} active={isActive(item)} disabled={item.disabled} href={item.href}>
                                {item.label}
                            </NavItem>
                        ))}
                    </nav>
                </SheetContent>
            </Sheet>
        </>
    );
}


function ToastHost() {
    const [items, setItems] = useState<Array<{ id: string; title?: string; description?: string; duration: number; variant?: 'default' | 'destructive' | 'success' }>>([]);

    useEffect(() => {
        function onToast(e: Event) {
            const detail = (e as CustomEvent<{ id: string; title?: string; description?: string; duration: number; variant?: 'default' | 'destructive' | 'success' }>).detail;
            setItems((prev) => [...prev, detail]);
        }
        window.addEventListener('app:toast', onToast as EventListener);
        return () => window.removeEventListener('app:toast', onToast as EventListener);
    }, []);

    function dismiss(id: string): void {
        setItems((prev) => prev.filter((t) => t.id !== id));
    }

    return (
        <ToastProvider swipeDirection="right">
            {items.map((t) => (
                <Toast key={t.id} duration={t.duration} onOpenChange={(open) => !open && dismiss(t.id)} className="data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:slide-out-to-right-full data-[state=open]:slide-in-from-top-4 sm:data-[state=open]:slide-in-from-bottom-4" variant={t.variant === 'destructive' ? 'destructive' : t.variant === 'success' ? 'success' : 'default'}>
                    {t.title ? <ToastTitle>{t.title}</ToastTitle> : null}
                    {t.description ? <ToastDescription>{t.description}</ToastDescription> : null}
                    <ToastClose />
                </Toast>
            ))}
            <ToastViewport />
        </ToastProvider>
    );
}
