import AppHeaderLayout from '@/layouts/app/app-header-layout'
import { setUrlDefaults } from '@/wayfinder'
import { usePage } from '@inertiajs/react'
import type { PropsWithChildren, ReactNode } from 'react'
import { useEffect, useMemo } from 'react'
import Breadcrumbs from '@/components/breadcrumbs'
import reportsRoutes from '@/routes/shops/reports'
import { SectionNav } from '@/components/section-nav'

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
      { key: 'dashboard', label: 'Tableau de bord', href: !disabled ? `/shops/${shopArg}/dashboard` : '#', disabled },
      { key: 'products', label: 'Ventes produits', href: !disabled ? reportsRoutes.products.url({ shop: shopArg }) : '#', disabled },
      { key: 'services', label: 'Ventes services', href: !disabled ? reportsRoutes.services.url({ shop: shopArg }) : '#', disabled },
      { key: 'clients', label: 'Clients', href: !disabled ? reportsRoutes.clients.url({ shop: shopArg }) : '#', disabled },
      { key: 'hairdressers', label: 'Coiffeurs', href: !disabled ? reportsRoutes.hairdressers.url({ shop: shopArg }) : '#', disabled },
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
    <AppHeaderLayout>
      <SectionNav items={items} isActive={isActive} />
      {breadcrumbs && breadcrumbs.length > 0 && (
        <div className="print:hidden">
          <Breadcrumbs items={breadcrumbs} />
        </div>
      )}
      {title && <h1 className="text-xl font-semibold tracking-tight md:text-2xl print:hidden">{title}</h1>}
      <div className="min-w-0 overflow-x-auto print:overflow-visible">{children}</div>
    </AppHeaderLayout>
  )
}
