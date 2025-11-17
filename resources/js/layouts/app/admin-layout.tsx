import AppHeaderLayout from '@/layouts/app/app-header-layout'
import { cn } from '@/lib/utils'
import type { PropsWithChildren, ReactNode } from 'react'
import { Link, usePage } from '@inertiajs/react'
import Breadcrumbs from '@/components/breadcrumbs'

interface AdminLayoutProps {
  breadcrumbs?: Array<{ title: string; href?: string }>
  title?: ReactNode
  // Allow custom admin menu. If not provided, we show the two default entries without links.
  menu?: Array<{ key: string; label: string; href?: string; disabled?: boolean }>
}

export default function AdminLayout({ children, breadcrumbs, title, menu }: PropsWithChildren<AdminLayoutProps>) {
  const page = usePage<{ auth?: { user?: { roles?: string[] } } }>()
  const roles = page.props.auth?.user?.roles ?? []
  const isSuper = roles.includes('Super admin')

  const baseItems = menu ?? [
    { key: 'users', label: 'Gestion des utilisateurs', href: undefined, disabled: true },
    { key: 'shops', label: 'Gestion des boutiques', href: undefined, disabled: true },
  ]

  const items = isSuper ? baseItems : []

  const pathname = typeof window !== 'undefined' ? window.location.pathname : ''
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
    <AppHeaderLayout contentFullWidth contentClassName="px-26 md:px-28 mt-5" hideSecondaryNav>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-[220px_1fr] md:gap-5">
        {items.length > 0 && (
          <aside className="h-fit bg-background p-2 md:sticky md:top-4 rounded-md">
            <nav className="flex flex-col">
              {items.map((item) => (
                <NavItem key={item.key} active={isActive(item.href)} disabled={item.disabled} href={item.href}>
                  {item.label}
                </NavItem>
              ))}
            </nav>
          </aside>
        )}
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
