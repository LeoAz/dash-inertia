import { cn } from '@/lib/utils'
import type { SaleRow } from '@/types/sale'

const LABELS = {
    orange_money: { label: 'Orange Money', className: 'bg-orange-500/10 text-orange-700 dark:text-orange-400' },
    caisse: { label: 'Caisse', className: 'bg-secondary text-secondary-foreground' },
}

export function PaymentBadge({ method }: { method?: SaleRow['payment_method'] | null }) {
    if (!method) {
        return <span className="text-muted-foreground">—</span>
    }
    const { label, className } = LABELS[method]
    return <span className={cn('inline-flex rounded-md px-2 py-0.5 text-xs font-medium whitespace-nowrap', className)}>{label}</span>
}
