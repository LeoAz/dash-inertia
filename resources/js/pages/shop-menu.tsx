import AppHeaderLayout from '@/layouts/app/app-header-layout'
import { Head, Link, usePage } from '@inertiajs/react'
import { LayoutDashboard, ShoppingCart, BarChart3, History, Package, Scissors, Percent } from 'lucide-react'
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

  const baseItems: Array<NavItem & { color: string; iconBg?: string; description?: string }> = [
    {
      title: 'Tableau de bord',
      href: '#',
      icon: LayoutDashboard,
      color: 'bg-indigo-500/10',
      iconBg: 'bg-indigo-500/20',
      description: 'Vue d’ensemble des indicateurs de la boutique',
    },
    {
      title: 'Produits',
      href: '#',
      icon: Package,
      color: 'bg-amber-500/10',
      iconBg: 'bg-amber-500/20',
      description: 'Gérer le catalogue des produits',
    },
    {
      title: 'Services',
      href: '#',
      icon: Scissors,
      color: 'bg-violet-500/10',
      iconBg: 'bg-violet-500/20',
      description: 'Créer et administrer les prestations',
    },
    {
      title: 'Personnel (Coiffeurs)',
      href: '#',
      icon: Scissors,
      color: 'bg-sky-500/10',
      iconBg: 'bg-sky-500/20',
      description: 'Gérer les membres du personnel et leurs profils',
    },
    {
      title: 'Promotions',
      href: '#',
      icon: Percent,
      color: 'bg-fuchsia-500/10',
      iconBg: 'bg-fuchsia-500/20',
      description: 'Mettre en place des remises et offres',
    },
    {
      title: 'Vente',
      href: '#',
      icon: ShoppingCart,
      color: 'bg-emerald-500/10',
      iconBg: 'bg-emerald-500/20',
      description: 'Encaisser une vente rapidement',
    },
    {
      title: 'Historique des ventes',
      href: '#',
      icon: History,
      color: 'bg-cyan-500/10',
      iconBg: 'bg-cyan-500/20',
      description: 'Consulter et rechercher les ventes passées',
    },
    {
      title: 'Rapport',
      href: '#',
      icon: BarChart3,
      color: 'bg-rose-500/10',
      iconBg: 'bg-rose-500/20',
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
    <AppHeaderLayout contentFullWidth contentClassName="px-18 sm:px-20 md:px-24 lg:px-28 mt-5">
      <Head title="Boutique - Menus" />
      <section className="mx-auto max-w-7xl">
        <div className="mb-6 md:mb-8">
          <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
            {currentShopName ? `Bienvenue dans ${currentShopName} 👋` : 'Bienvenue dans votre boutique 👋'}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground md:text-base">Choisissez une action pour continuer.</p>
        </div>

        {shops.length === 0 ? (
          <p className="text-muted-foreground">Aucune boutique associée.</p>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 md:gap-6">
            {items.map((item) => (
              <MenuCard
                key={item.title}
                href={item.href ?? '#'}
                title={item.title}
                description={item.description}
                icon={<item.icon className="h-10 w-10" />}
                bg={item.color}
                iconBg={item.iconBg}
              />
            ))}
          </div>
        )}
      </section>
    </AppHeaderLayout>
  )
}

function MenuCard({ href, title, description, icon, bg, iconBg }: { href: string; title: string; description?: string; icon: React.ReactNode; bg?: string; iconBg?: string }) {
  return (
    <Link href={href} className="block">
      <Card className={`transition-colors hover:border-foreground/30 ${bg ?? ''}`}>
        <CardContent className="flex items-start gap-5 p-6 min-h-[120px] md:min-h-[140px]">
          <div className={`rounded-md p-3 ${iconBg ?? 'bg-muted/50'}`}>{icon}</div>
          <div>
            <div className="text-lg font-semibold leading-tight md:text-xl">{title}</div>
            {description && <div className="mt-0.5 text-sm text-muted-foreground md:text-base">{description}</div>}
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
