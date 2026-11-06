import AppHeaderLayout from '@/layouts/app/app-header-layout';
import { setUrlDefaults } from '@/wayfinder';
import { usePage } from '@inertiajs/react';
import type { PropsWithChildren, ReactNode } from 'react';
import { useEffect, useMemo, useState } from 'react';
import Breadcrumbs from '@/components/breadcrumbs';
import { ToastProvider, ToastViewport, Toast, ToastTitle, ToastDescription, ToastClose } from '@/components/ui/toast';

interface ShopConfigLayoutProps {
    breadcrumbs?: Array<{ title: string; href?: string }>;
    title?: ReactNode;
    shopId?: number | string;
}

export default function ShopConfigLayout({ children, breadcrumbs, title, shopId }: PropsWithChildren<ShopConfigLayoutProps>) {
    const { props } = usePage<{ shop?: { id: number | string } }>();

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

    return (
        <AppHeaderLayout>
            <ToastHost />
            {breadcrumbs && breadcrumbs.length > 0 && <Breadcrumbs items={breadcrumbs} />}
            {title && <h1 className="text-xl font-semibold tracking-tight md:text-2xl">{title}</h1>}
            <div className="min-w-0 overflow-x-auto">{children}</div>
        </AppHeaderLayout>
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
