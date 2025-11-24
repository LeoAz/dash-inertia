import AppHeaderLayout from '@/layouts/app/app-header-layout'
import { cn } from '@/lib/utils'
import { setUrlDefaults } from '@/wayfinder'
import { Link, usePage } from '@inertiajs/react'
import type { PropsWithChildren, ReactNode } from 'react'
import { useEffect, useMemo, useState } from 'react'
import Breadcrumbs from '@/components/breadcrumbs'
import reportsRoutes from '@/routes/shops/reports'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'

interface ReportLayoutProps {
  breadcrumbs?: Array<{ title: string; href?: string }>
  title?: ReactNode
  shopId?: number | string
  menu?: Array<{ key: string; label: string; href?: string; disabled?: boolean }>
}

export default function ReportLayout({ children, breadcrumbs, title, shopId, menu }: PropsWithChildren<ReportLayoutProps>) {
  const page = usePage<{ shop?: { id: number | string } }>()
  const { props, url } = page

  const effectiveShopId = useMemo(() => {
    if (shopId !== undefined && shopId !== null) {
      return shopId
    }
    const pageShop = props?.shop
    if (pageShop && pageShop.id) {
      return pageShop.id
    }
    const match = typeof window !== 'undefined' ? window.location.pathname.match(/\/shops\/(\d+|[^/]+)/) : null
    return match ? match[1] : undefined
  }, [shopId, props])

  useEffect(() => {
    if (effectiveShopId !== undefined) {
      setUrlDefaults({ shop: effectiveShopId as number | string })
    }
  }, [effectiveShopId])

  const items = useMemo(() => {
    if (menu) return menu
    const disabled = effectiveShopId === undefined
    const shopArg = (effectiveShopId ?? 0) as number
    return [
      { key: 'dashboard', label: 'Dashboard', href: !disabled ? `/shops/${shopArg}/dashboard` : '#', disabled },
      { key: 'products', label: 'Rapport ventes produits', href: !disabled ? reportsRoutes.products.url({ shop: shopArg }) : '#', disabled },
      { key: 'services', label: 'Rapport ventes services', href: !disabled ? reportsRoutes.services.url({ shop: shopArg }) : '#', disabled },
      { key: 'clients', label: 'Rapport clients', href: !disabled ? reportsRoutes.clients.url({ shop: shopArg }) : '#', disabled },
      { key: 'hairdressers', label: 'Rapport coiffeurs', href: !disabled ? reportsRoutes.hairdressers.url({ shop: shopArg }) : '#', disabled },
    ]
  }, [effectiveShopId, menu])

  const pathname = typeof window !== 'undefined' ? window.location.pathname : url
  const isActive = (href?: string): boolean => {
    if (!href) return false
    try {
      const u = new URL(href, typeof window !== 'undefined' ? window.location.origin : 'http://localhost')
      return pathname.startsWith(u.pathname)
    } catch {
      return false
    }
  }

  return (
    <AppHeaderLayout contentFullWidth contentClassName="px-26 md:px-28 mt-5">
      {/* Sur tablette (<lg), masquer le menu gauche. Sur desktop (>=lg), 2 colonnes. */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-[220px_1fr] lg:gap-5">
        <aside className="hidden h-fit rounded-md bg-background p-2 lg:sticky lg:top-4 lg:block">
          <nav className="flex flex-col">
            {items.map((item) => (
              <NavItem key={item.key} active={isActive(item.href)} disabled={item.disabled} href={item.href}>
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
            <MobileMenu items={items} isActiveHref={isActive} />
          </div>
          {breadcrumbs && breadcrumbs.length > 0 && (
            <div className="mb-2 hidden md:mb-3 lg:block">
              <Breadcrumbs items={breadcrumbs} />
            </div>
          )}
          {title && <h1 className="mb-2 text-base font-semibold md:mb-3 md:text-xl">{title}</h1>}
          <div className="overflow-x-auto">{children}</div>
        </section>
      </div>
    </AppHeaderLayout>
  )
}

function NavItem({ href, children, active, disabled }: PropsWithChildren<{ href?: string; active?: boolean; disabled?: boolean }>) {
  const className = cn(
    'rounded-sm px-3 py-2 text-sm transition-colors',
    active ? 'bg-muted font-medium text-foreground' : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
    disabled && 'pointer-events-none opacity-50',
  )

  if (!href || disabled) {
    return <span className={className}>{children}</span>
  }

  return (
    <Link href={href} className={className} preserveScroll>
      {children}
    </Link>
  )
}

function MobileMenu({ items, isActiveHref }: { items: Array<{ key: string; label: string; href?: string; disabled?: boolean }>; isActiveHref: (href?: string) => boolean }) {
  const [open, setOpen] = useState(false)
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
              <NavItem key={item.key} active={isActiveHref(item.href)} disabled={item.disabled} href={item.href}>
                {item.label}
              </NavItem>
            ))}
          </nav>
        </SheetContent>
      </Sheet>
    </>
  )
}
