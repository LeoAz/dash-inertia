import AppHeaderLayout from '@/layouts/app/app-header-layout'
import { SectionNav } from '@/components/section-nav'
import type { PropsWithChildren, ReactNode } from 'react'
import { usePage } from '@inertiajs/react'
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
    <AppHeaderLayout>
      <SectionNav items={items} isActive={isActive} />
      {breadcrumbs && breadcrumbs.length > 0 && <Breadcrumbs items={breadcrumbs} />}
      {title && <h1 className="text-xl font-semibold tracking-tight md:text-2xl">{title}</h1>}
      <div className="min-w-0 overflow-x-auto">{children}</div>
    </AppHeaderLayout>
  )
}
