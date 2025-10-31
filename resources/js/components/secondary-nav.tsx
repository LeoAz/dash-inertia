import { Link, usePage } from '@inertiajs/react'
import { cn, resolveUrl } from '@/lib/utils'
import type { NavItem } from '@/types'
import { Settings, LayoutDashboard, ShoppingCart, BarChart3, History } from 'lucide-react'
import { index as salesIndex } from '@/routes/shops/sales'
import { index as productsIndex } from '@/routes/shops/products'
import reports from '@/routes/shops/reports'
import { dashboard as shopDashboard } from '@/routes/shops'

interface SecondaryNavProps {
  items?: NavItem[]
  className?: string
}

// Keep a base template for default items; we'll inject dynamic hrefs at runtime
const baseDefaultItems: NavItem[] = [
  { title: 'Configuration', href: '#', icon: Settings },
  { title: 'Tableau de bord', href: '#', icon: LayoutDashboard },
  { title: 'Vente', href: '#', icon: ShoppingCart },
  { title: 'Historique des ventes', href: '#', icon: History },
  { title: 'Rapport', href: '#', icon: BarChart3 },
]

export default function SecondaryNav({ items, className }: SecondaryNavProps) {
  const page = usePage()

  // Derive current shop id from the URL (e.g. /shops/{id}/...)
  const pathname = typeof window !== 'undefined' ? window.location.pathname : (page.url as string)
  const match = pathname.match(/\/shops\/(\d+|[^/]+)/)
  const shopId = match ? match[1] : undefined

  const computedItems: NavItem[] = (items ?? baseDefaultItems).map((it) => {
    if (shopId) {
      const numericShop = Number.isNaN(Number(shopId)) ? (shopId as unknown as number) : Number(shopId)
      if (it.title === 'Tableau de bord') {
        return { ...it, href: shopDashboard.url({ shop: numericShop }) }
      }
      if (it.title === 'Configuration') {
        return { ...it, href: productsIndex.url({ shop: numericShop }) }
      }
      if (it.title === 'Vente') {
        return { ...it, href: salesIndex.url({ shop: numericShop }) }
      }
      if (it.title === 'Historique des ventes') {
        return { ...it, href: `/shops/${numericShop}/sales/history` }
      }
      if (it.title === 'Rapport') {
        return { ...it, href: reports.products.url({ shop: numericShop }) }
      }
    }
    return it
  })

  return (
    <nav
      aria-label="secondary navigation"
      className={cn(
        'border-b px-26 md:px-28 bg-background/60 supports-[backdrop-filter]:backdrop-blur',
        className,
      )}
    >
      <div className="flex h-12 items-center gap-2 overflow-x-auto">
        {computedItems.map((item) => {
          const href = resolveUrl(item.href)
          const isActive = item.isActive ?? page.url.startsWith(href)
          return (
            <Link
              key={item.title}
              href={href}
              prefetch
              className={cn(
                'relative rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2',
                isActive && 'text-foreground',
              )}
            >
              {item.icon ? <item.icon className="h-4 w-4" /> : null}
              <span>{item.title}</span>
              {/* Active indicator */}
              <span
                aria-hidden="true"
                className={cn(
                  'pointer-events-none absolute inset-x-2 -bottom-1 h-0.5 rounded-full bg-primary/80 transition-opacity',
                  isActive ? 'opacity-100' : 'opacity-0',
                )}
              />
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
