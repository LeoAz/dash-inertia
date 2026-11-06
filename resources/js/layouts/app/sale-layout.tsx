import { useEffect, useMemo, useState, type PropsWithChildren } from 'react'
import { router, usePage } from '@inertiajs/react'
import { format } from 'date-fns'
import { EditIcon, PrinterIcon, SearchIcon, TrashIcon } from 'lucide-react'
import { PaymentBadge } from '@/components/sales/payment-badge'
import { SaleCard } from '@/components/sales/sale-card'
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import AppHeaderLayout from '@/layouts/app/app-header-layout'
import { formatCurrency } from '@/lib/thermal-ticket'
import salesRoutes from '@/routes/shops/sales/index'
import type { SaleRow } from '@/types/sale'
import { setUrlDefaults } from '@/wayfinder'

interface SaleLayoutProps {
    shopId: number | string
    sales: SaleRow[]
    onEditSale: (sale: SaleRow) => void
    onViewSale: (sale: SaleRow) => void
}

function matches(sale: SaleRow, query: string): boolean {
    const items = (sale.details ?? []).map((d) => d.name).join(' ')
    return `${sale.receipt_number ?? ''} ${sale.customer_name ?? ''} ${sale.hairdresser_name ?? ''} ${sale.promotion_label ?? ''} ${items}`
        .toLowerCase()
        .includes(query)
}

export default function SaleLayout({ shopId, sales, onEditSale, onViewSale, children }: PropsWithChildren<SaleLayoutProps>) {
    const { props } = usePage<{ auth?: { user?: { roles?: string[] } } }>()
    const roles = props.auth?.user?.roles ?? []
    const canManage = roles.includes('Super admin') || roles.includes('admin')

    const [search, setSearch] = useState('')
    const [toDelete, setToDelete] = useState<SaleRow | null>(null)

    useEffect(() => {
        setUrlDefaults({ shop: shopId })
    }, [shopId])

    const rows = useMemo(() => {
        const query = search.trim().toLowerCase()
        const filtered = query ? sales.filter((sale) => matches(sale, query)) : sales
        return [...filtered].sort((a, b) => new Date(b.sale_date).getTime() - new Date(a.sale_date).getTime())
    }, [sales, search])

    const confirmDelete = () => {
        if (!toDelete) {
            return
        }
        router.delete(salesRoutes.destroy.url({ shop: shopId as number, sale: toDelete.id as number }), {
            preserveScroll: true,
            onFinish: () => setToDelete(null),
        })
    }

    const actions = (sale: SaleRow) => (
        <>
            <Button variant="outline" size="icon" onClick={() => onViewSale(sale)} aria-label="Imprimer le reçu">
                <PrinterIcon />
            </Button>
            {canManage && (
                <>
                    <Button variant="outline" size="icon" onClick={() => onEditSale(sale)} aria-label="Modifier la vente">
                        <EditIcon />
                    </Button>
                    <Button variant="ghost" size="icon" className="text-destructive-foreground" onClick={() => setToDelete(sale)} aria-label="Supprimer la vente">
                        <TrashIcon />
                    </Button>
                </>
            )}
        </>
    )

    return (
        <AppHeaderLayout>
            {children}

            <section className="space-y-3">
                <div className="flex items-center gap-3">
                    <div className="relative max-w-md flex-1">
                        <SearchIcon className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
                        <Input
                            type="search"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Ticket, client, coiffeur…"
                            aria-label="Rechercher une vente"
                            className="bg-card pl-9"
                        />
                    </div>
                    <span className="ms-auto shrink-0 text-sm text-muted-foreground">{rows.length} vente{rows.length > 1 ? 's' : ''}</span>
                </div>

                {rows.length === 0 ? (
                    <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">Aucune vente pour le moment.</p>
                ) : (
                    <>
                        <div className="grid gap-3 md:grid-cols-2 xl:hidden">
                            {rows.map((sale) => (
                                <SaleCard key={sale.id} sale={sale} actions={actions(sale)} />
                            ))}
                        </div>

                        <div className="hidden overflow-hidden rounded-xl border bg-card xl:block">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-muted/50">
                                        <TableHead>N° Ticket</TableHead>
                                        <TableHead>Heure</TableHead>
                                        <TableHead>Client</TableHead>
                                        <TableHead>Coiffeur</TableHead>
                                        <TableHead>Prestations</TableHead>
                                        <TableHead>Paiement</TableHead>
                                        <TableHead className="text-right">Total</TableHead>
                                        <TableHead className="w-px" />
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {rows.map((sale) => (
                                        <TableRow key={sale.id}>
                                            <TableCell className="font-medium">{sale.receipt_number ?? `#${sale.id}`}</TableCell>
                                            <TableCell>{format(new Date(sale.sale_date), 'HH:mm')}</TableCell>
                                            <TableCell>{sale.customer_name ?? '—'}</TableCell>
                                            <TableCell>{sale.hairdresser_name ?? '—'}</TableCell>
                                            <TableCell className="max-w-64 truncate text-muted-foreground">
                                                {(sale.details ?? []).map((d) => d.name).join(', ') || '—'}
                                            </TableCell>
                                            <TableCell><PaymentBadge method={sale.payment_method} /></TableCell>
                                            <TableCell className="text-right font-medium tabular-nums">{formatCurrency(Number(sale.total_amount ?? 0))}</TableCell>
                                            <TableCell>
                                                <div className="flex justify-end gap-1">{actions(sale)}</div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </>
                )}
            </section>

            <AlertDialog open={toDelete !== null} onOpenChange={(open) => !open && setToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Supprimer la vente</AlertDialogTitle>
                        <AlertDialogDescription>Cette action est irréversible. Les stocks des produits liés seront restaurés.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Annuler</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-white hover:bg-destructive/90">Supprimer</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </AppHeaderLayout>
    )
}
