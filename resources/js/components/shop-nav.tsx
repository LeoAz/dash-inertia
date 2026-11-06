import { Link, usePage } from '@inertiajs/react'
import { BarChart3, History, LayoutDashboard, LayoutGrid, type LucideIcon, Package, Percent, Scissors, ShoppingCart, Users } from 'lucide-react'
import { cn } from '@/lib/utils'
import { dashboard, shopMenu } from '@/routes/shops'
import { index as hairdressersIndex } from '@/routes/shops/hairdressers'
import { index as productsIndex } from '@/routes/shops/products'
import { index as promotionsIndex } from '@/routes/shops/promotions'
import reports from '@/routes/shops/reports'
import { history, index as salesIndex } from '@/routes/shops/sales'
import { index as servicesIndex } from '@/routes/shops/services'

type NavEntry = { label: string; href: string; icon: LucideIcon; match: string; adminOnly?: boolean }

function entries(shop: string | number): NavEntry[] {
    const args = { shop: shop as number }
    return [
        { label: 'Accueil', href: shopMenu.url(args), icon: LayoutGrid, match: '/shop-menu' },
        { label: 'Ventes', href: salesIndex.url(args), icon: ShoppingCart, match: '/sales$' },
        { label: 'Historique', href: history.url(args), icon: History, match: '/sales/history' },
        { label: 'Tableau de bord', href: dashboard.url(args), icon: LayoutDashboard, match: '/dashboard', adminOnly: true },
        { label: 'Rapports', href: reports.products.url(args), icon: BarChart3, match: '/reports', adminOnly: true },
        { label: 'Produits', href: productsIndex.url(args), icon: Package, match: '/products', adminOnly: true },
        { label: 'Services', href: servicesIndex.url(args), icon: Scissors, match: '/services', adminOnly: true },
        { label: 'Coiffeurs', href: hairdressersIndex.url(args), icon: Users, match: '/hairdressers', adminOnly: true },
        { label: 'Promotions', href: promotionsIndex.url(args), icon: Percent, match: '/promotions', adminOnly: true },
    ]
}

/** Navigation principale d'une boutique : toujours visible, défilable au doigt sur tablette. */
export function ShopNav({ shopId, vendeurOnly }: { shopId: string | number; vendeurOnly: boolean }) {
    const path = usePage().url.split('?')[0]
    const items = entries(shopId).filter((item) => !vendeurOnly || !item.adminOnly)

    return (
        <nav aria-label="Navigation de la boutique" className="no-scrollbar flex gap-1 overflow-x-auto px-2 md:px-4 lg:px-6">
            {items.map((item) => {
                const active = new RegExp(`${item.match}(/|$)`).test(path)
                return (
                    <Link
                        key={item.label}
                        href={item.href}
                        prefetch
                        aria-current={active ? 'page' : undefined}
                        className={cn(
                            'flex min-h-11 shrink-0 items-center gap-2 border-b-2 px-2.5 text-sm font-medium whitespace-nowrap transition-colors',
                            active ? 'border-brand text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground',
                        )}
                    >
                        <item.icon className="hidden size-4 lg:block" aria-hidden />
                        {item.label}
                    </Link>
                )
            })}
        </nav>
    )
}
