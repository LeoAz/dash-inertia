import { Link } from '@inertiajs/react'
import { cn } from '@/lib/utils'

export type SectionNavItem = { key: string; label: string; href?: string; disabled?: boolean }

/** Sous-navigation d'une section : onglets défilables, toujours accessibles sans menu caché. */
export function SectionNav({ items, isActive }: { items: SectionNavItem[]; isActive: (href?: string) => boolean }) {
    if (items.length === 0) {
        return null
    }
    return (
        <nav className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 md:mx-0 md:px-0 print:hidden">
            {items.map((item) => {
                const className = cn(
                    'flex min-h-10 shrink-0 items-center rounded-full border px-4 text-sm font-medium whitespace-nowrap transition-colors pointer-coarse:min-h-11',
                    isActive(item.href) ? 'border-primary bg-primary text-primary-foreground' : 'bg-card text-muted-foreground hover:text-foreground',
                    item.disabled && 'pointer-events-none opacity-50',
                )
                return item.href && !item.disabled ? (
                    <Link key={item.key} href={item.href} className={className} preserveScroll>
                        {item.label}
                    </Link>
                ) : (
                    <span key={item.key} className={className}>{item.label}</span>
                )
            })}
        </nav>
    )
}
