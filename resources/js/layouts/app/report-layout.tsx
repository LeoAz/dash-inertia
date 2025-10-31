import AppHeaderLayout from '@/layouts/app/app-header-layout'
import { cn } from '@/lib/utils'
import { setUrlDefaults } from '@/wayfinder'
import { Link, usePage } from '@inertiajs/react'
import type { PropsWithChildren, ReactNode } from 'react'
import { useEffect, useMemo } from 'react'
import Breadcrumbs from '@/components/breadcrumbs'
import reportsRoutes from '@/routes/shops/reports'

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
    const pageShop = (props as any)?.shop
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
      <div className="grid grid-cols-1 gap-3 md:grid-cols-[220px_1fr] md:gap-5">
        <aside className="h-fit bg-background p-2 md:sticky md:top-4 rounded-md">
          <nav className="flex flex-col">
            {items.map((item) => (
              <NavItem key={item.key} active={isActive(item.href)} disabled={item.disabled} href={item.href}>
                {item.label}
              </NavItem>
            ))}
          </nav>
        </aside>
        <section className="min-h-[60vh] bg-background p-2 md:p-3 rounded-md">
          {breadcrumbs && breadcrumbs.length > 0 && (
            <div className="mb-2 md:mb-3">
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
