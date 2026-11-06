import { useEffect, useMemo, useRef } from 'react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { PrinterIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { PaymentBadge } from '@/components/sales/payment-badge'
import { buildTicketHtml, formatCurrency, lineTotal, printThermalTicket, type TicketShop } from '@/lib/thermal-ticket'
import type { SaleRow } from '@/types/sale'

interface SaleDetailsProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    sale: SaleRow | null
    shop?: TicketShop & { id: number | string }
    /** Lance l'impression à l'ouverture, une seule fois par vente. */
    autoPrint?: boolean
}

export default function SaleDetails({ open, onOpenChange, sale, shop, autoPrint }: SaleDetailsProps) {
    const receiptNumber = sale?.receipt_number ?? (sale ? String(sale.id) : '')
    const details = useMemo(() => sale?.details ?? [], [sale?.details])
    const subtotal = details.reduce((sum, line) => sum + lineTotal(line), 0)
    const total = Number(sale?.total_amount ?? 0)
    const discount = sale?.promotion_label ? subtotal - total : 0

    const printTicket = () => {
        if (!sale) {
            return
        }
        void printThermalTicket(buildTicketHtml(sale, shop, window.location.origin))
    }

    const lastPrintedId = useRef<SaleRow['id'] | null>(null)

    useEffect(() => {
        if (!autoPrint || !open || !sale || lastPrintedId.current === sale.id) {
            return
        }
        lastPrintedId.current = sale.id
        printTicket()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [autoPrint, open, sale?.id])

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="w-full gap-0 sm:max-w-md">
                <SheetHeader className="border-b">
                    <SheetTitle>Reçu N° {receiptNumber}</SheetTitle>
                    <SheetDescription>
                        {sale ? format(new Date(sale.sale_date), "dd MMMM yyyy 'à' HH:mm", { locale: fr }) : ''}
                    </SheetDescription>
                </SheetHeader>

                {sale && (
                    <div className="flex-1 space-y-4 overflow-y-auto p-4">
                        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
                            {sale.customer_name && (
                                <>
                                    <dt className="text-muted-foreground">Client</dt>
                                    <dd className="text-right font-medium">{sale.customer_name}</dd>
                                </>
                            )}
                            {sale.hairdresser_name && (
                                <>
                                    <dt className="text-muted-foreground">Coiffeur</dt>
                                    <dd className="text-right font-medium">{sale.hairdresser_name}</dd>
                                </>
                            )}
                            <dt className="text-muted-foreground">Paiement</dt>
                            <dd className="text-right"><PaymentBadge method={sale.payment_method} /></dd>
                        </dl>

                        <ul className="divide-y rounded-lg border bg-card">
                            {details.map((line, index) => (
                                <li key={`${line.type}-${index}`} className="flex items-center justify-between gap-3 p-3 text-sm">
                                    <div className="min-w-0">
                                        <div className="font-medium">{line.name}</div>
                                        {Number(line.quantity ?? 1) > 1 && (
                                            <div className="text-xs text-muted-foreground">
                                                {line.quantity} × {formatCurrency(Number(line.unit_price ?? line.price ?? 0))}
                                            </div>
                                        )}
                                    </div>
                                    <div className="shrink-0 font-medium tabular-nums">{formatCurrency(lineTotal(line))}</div>
                                </li>
                            ))}
                        </ul>

                        <div className="space-y-1.5">
                            {discount > 0 && (
                                <>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">Sous-total</span>
                                        <span className="tabular-nums">{formatCurrency(subtotal)}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">Remise ({sale.promotion_label})</span>
                                        <span className="tabular-nums">-{formatCurrency(discount)}</span>
                                    </div>
                                </>
                            )}
                            <div className="flex justify-between border-t pt-2 text-lg font-semibold">
                                <span>Total</span>
                                <span className="tabular-nums">{formatCurrency(total)}</span>
                            </div>
                        </div>
                    </div>
                )}

                <div className="mt-auto grid grid-cols-2 gap-2 border-t p-4">
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Fermer</Button>
                    <Button onClick={printTicket} disabled={!sale}>
                        <PrinterIcon />
                        Imprimer
                    </Button>
                </div>
            </SheetContent>
        </Sheet>
    )
}
