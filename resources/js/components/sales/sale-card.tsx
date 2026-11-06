import type { ReactNode } from 'react'
import { format } from 'date-fns'
import { PaymentBadge } from '@/components/sales/payment-badge'
import { formatCurrency } from '@/lib/thermal-ticket'
import type { SaleRow } from '@/types/sale'

/** Résumé d'une vente pour l'écran tactile : tout est lisible sans survol ni défilement horizontal. */
export function SaleCard({ sale, actions, dateFormat = 'HH:mm' }: { sale: SaleRow; actions?: ReactNode; dateFormat?: string }) {
    const items = (sale.details ?? []).map((d) => (Number(d.quantity ?? 1) > 1 ? `${d.name} × ${d.quantity}` : d.name)).join(', ')

    return (
        <article className="flex flex-col gap-2 rounded-xl border bg-card p-3">
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <div className="truncate font-semibold">{sale.customer_name ?? 'Client de passage'}</div>
                    <div className="flex flex-wrap gap-x-2 text-xs text-muted-foreground">
                        <span>{sale.receipt_number ?? `#${sale.id}`}</span>
                        <span>{format(new Date(sale.sale_date), dateFormat)}</span>
                    </div>
                </div>
                <div className="shrink-0 text-right font-semibold tabular-nums">{formatCurrency(Number(sale.total_amount ?? 0))}</div>
            </div>
            {items && <p className="line-clamp-2 text-sm text-muted-foreground">{items}</p>}
            <div className="mt-auto flex items-center justify-between gap-2">
                <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                    <PaymentBadge method={sale.payment_method} />
                    {sale.hairdresser_name && <span className="truncate text-muted-foreground">{sale.hairdresser_name}</span>}
                </div>
                {actions && <div className="flex shrink-0 items-center gap-1">{actions}</div>}
            </div>
        </article>
    )
}
