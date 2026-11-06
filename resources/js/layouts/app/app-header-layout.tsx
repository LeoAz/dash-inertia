import { AppContent } from '@/components/app-content'
import { AppShell } from '@/components/app-shell'
import Logo from '@/components/navbar-components/logo'
import UserMenu from '@/components/navbar-components/user-menu'
import { ShopNav } from '@/components/shop-nav'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Toaster } from '@/components/ui/sonner'
import type { BreadcrumbItem } from '@/types'
import { setUrlDefaults } from '@/wayfinder'
import { Link, router, usePage } from '@inertiajs/react'
import type { PropsWithChildren } from 'react'

type LayoutProps = PropsWithChildren<{ breadcrumbs?: BreadcrumbItem[]; contentClassName?: string }>

export default function AppHeaderLayout({ children, contentClassName }: LayoutProps) {
    const { props: pageProps, url } = usePage<{ auth?: { shops?: Array<{ id: number | string; name: string }>; user?: { roles?: string[] } } }>()
    const shops = pageProps.auth?.shops ?? []
    const roles = pageProps.auth?.user?.roles ?? []
    const isSuper = roles.includes('Super admin')
    const isAdmin = roles.includes('admin')

    const urlShopId = url.match(/\/shops\/([^/?]+)/)?.[1]
    const currentShopId = urlShopId ?? (shops.length > 0 ? String(shops[0].id) : undefined)

    const handleShopChange = (newShopId: string): void => {
        const { pathname, search, hash } = window.location
        const nextPath = /\/shops\/[^/]+/.test(pathname) ? pathname.replace(/\/shops\/[^/]+/, `/shops/${newShopId}`) : `/shops/${newShopId}/shop-menu`
        setUrlDefaults({ shop: newShopId })
        router.visit(`${nextPath}${search}${hash}`, { preserveScroll: true, preserveState: false })
    }

    const logoHref = isSuper ? '/home-menu' : currentShopId ? `/shops/${currentShopId}/shop-menu` : '/'

    return (
        <AppShell>
            <header className="sticky top-0 z-40 border-b bg-card/95 backdrop-blur print:hidden">
                <div className="flex h-14 items-center gap-3 px-4 md:px-6 lg:px-8">
                    <Link href={logoHref} className="shrink-0" prefetch aria-label="Accueil">
                        <Logo />
                    </Link>
                    <Select key={currentShopId} value={currentShopId} onValueChange={handleShopChange} disabled={shops.length === 0}>
                        <SelectTrigger aria-label="Sélectionnez la boutique" className="max-w-56 min-w-0 border-transparent bg-secondary font-medium shadow-none">
                            <SelectValue placeholder="Boutique" />
                        </SelectTrigger>
                        <SelectContent>
                            {shops.map((shop) => (
                                <SelectItem key={shop.id} value={String(shop.id)}>
                                    {shop.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <div className="ms-auto flex items-center gap-2">
                        {isSuper && (
                            <nav className="flex items-center gap-1 text-sm text-muted-foreground max-md:hidden">
                                <Link href="/admin/users" className="flex min-h-11 items-center px-2 hover:text-foreground">Utilisateurs</Link>
                                <Link href="/admin/shops" className="flex min-h-11 items-center px-2 hover:text-foreground">Boutiques</Link>
                            </nav>
                        )}
                        <UserMenu />
                    </div>
                </div>
                {urlShopId && <ShopNav shopId={urlShopId} vendeurOnly={!isSuper && !isAdmin} />}
            </header>
            <AppContent className={contentClassName}>{children}</AppContent>
            <Toaster />
        </AppShell>
    )
}
