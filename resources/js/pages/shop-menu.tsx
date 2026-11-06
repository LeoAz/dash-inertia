import AppHeaderLayout from '@/layouts/app/app-header-layout'
import { Head, Link, usePage } from '@inertiajs/react'
import { LayoutDashboard, ShoppingCart, BarChart3, History, Package, Scissors, Percent, Users } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import type { NavItem } from '@/types'
import { index as salesIndex } from '@/routes/shops/sales'
import { index as productsIndex } from '@/routes/shops/products'
import { index as servicesIndex } from '@/routes/shops/services'
import { index as hairdressersIndex } from '@/routes/shops/hairdressers'
import { index as promotionsIndex } from '@/routes/shops/promotions'
import reports from '@/routes/shops/reports'
import { dashboard as shopDashboard } from '@/routes/shops'

type PageProps = {
  auth?: { user?: { roles?: string[] }; shops?: Array<{ id: number | string; name: string }> }
}

export default function ShopMenu() {
  const { props } = usePage<PageProps>()
  const roles = props.auth?.user?.roles ?? []
  const shops = props.auth?.shops ?? []

  const isVendeur = roles.includes('vendeur')

  const currentShopId = (() => {
    if (typeof window !== 'undefined') {
      const match = window.location.pathname.match(/\/shops\/(\d+|[^/]+)/)
      if (match) return String(match[1])
    }
    return shops.length > 0 ? String(shops[0].id) : undefined
  })()

  const numericShop = currentShopId ? (Number.isNaN(Number(currentShopId)) ? (currentShopId as unknown as number) : Number(currentShopId)) : undefined
  const currentShopName = (() => {
    if (!currentShopId) return ''
    const found = shops.find((s) => String(s.id) === String(currentShopId))
    return found?.name ?? ''
  })()

  const baseItems: Array<NavItem & { description?: string }> = [
    {
      title: 'Vente',
      href: '#',
      icon: ShoppingCart,
      description: 'Encaisser une vente rapidement',
    },
    {
      title: 'Tableau de bord',
      href: '#',
      icon: LayoutDashboard,
      description: 'Vue d’ensemble des indicateurs de la boutique',
    },
    {
      title: 'Produits',
      href: '#',
      icon: Package,
      description: 'Gérer le catalogue des produits',
    },
    {
      title: 'Services',
      href: '#',
      icon: Scissors,
      description: 'Créer et administrer les prestations',
    },
    {
      title: 'Personnel (Coiffeurs)',
      href: '#',
      icon: Users,
      description: 'Gérer les membres du personnel et leurs profils',
    },
    {
      title: 'Promotions',
      href: '#',
      icon: Percent,
      description: 'Mettre en place des remises et offres',
    },
    {
      title: 'Historique des ventes',
      href: '#',
      icon: History,
      description: 'Consulter et rechercher les ventes passées',
    },
    {
      title: 'Rapport',
      href: '#',
      icon: BarChart3,
      description: 'Analyser les performances (produits, chiffres)',
    },
  ]

  let items = baseItems.map((it) => {
    if (numericShop !== undefined) {
      if (it.title === 'Tableau de bord') return { ...it, href: shopDashboard.url({ shop: numericShop }) }
      if (it.title === 'Produits') return { ...it, href: productsIndex.url({ shop: numericShop }) }
      if (it.title === 'Services') return { ...it, href: servicesIndex.url({ shop: numericShop }) }
      if (it.title === 'Personnel (Coiffeurs)') return { ...it, href: hairdressersIndex.url({ shop: numericShop }) }
      if (it.title === 'Promotions') return { ...it, href: promotionsIndex.url({ shop: numericShop }) }
      if (it.title === 'Vente') return { ...it, href: salesIndex.url({ shop: numericShop }) }
      if (it.title === 'Historique des ventes') return { ...it, href: `/shops/${numericShop}/sales/history` }
      if (it.title === 'Rapport') return { ...it, href: reports.products.url({ shop: numericShop }) }
    }
    return it
  })

  if (isVendeur) {
    const allowed = new Set(['Vente', 'Historique des ventes'])
    items = items.filter((it) => allowed.has(it.title))
  }

  return (
    <AppHeaderLayout>
      <Head title="Boutique - Menus" />
      <section>
        <div className="mb-5">
          <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">{currentShopName || 'Votre boutique'}</h1>
          <p className="mt-1 text-sm text-muted-foreground">Choisissez une action pour continuer.</p>
        </div>

        {shops.length === 0 ? (
          <p className="text-muted-foreground">Aucune boutique associée.</p>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:gap-4 xl:grid-cols-3">
            {items.map((item) => (
              <MenuCard
                key={item.title}
                href={String(item.href ?? '#')}
                title={item.title}
                description={item.description}
                icon={item.icon ? <item.icon className="size-6" /> : null}
              />
            ))}
          </div>
        )}
      </section>
    </AppHeaderLayout>
  )
}

function MenuCard({ href, title, description, icon }: { href: string; title: string; description?: string; icon: React.ReactNode }) {
  return (
    <Link href={href} prefetch className="block rounded-xl focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none">
      <Card className="h-full py-0 transition-colors hover:border-brand active:bg-accent">
        <CardContent className="flex items-center gap-4 p-4 md:p-5">
          <div className="grid size-12 shrink-0 place-items-center rounded-lg bg-accent text-accent-foreground">{icon}</div>
          <div className="min-w-0">
            <div className="font-semibold">{title}</div>
            {description && <div className="mt-0.5 text-sm text-muted-foreground">{description}</div>}
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
