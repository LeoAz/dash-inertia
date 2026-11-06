import { useState } from 'react'
import { Head, router } from '@inertiajs/react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { CalendarIcon, PlusIcon } from 'lucide-react'
import { toast } from 'sonner'
import SaleDetails from '@/components/sales/sale-details'
import SaleForm from '@/components/sales/sale-form'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import SaleLayout from '@/layouts/app/sale-layout'
import { formatCurrency } from '@/lib/thermal-ticket'
import salesRoutes from '@/routes/shops/sales/index'
import type { SaleRow, SalesPageProps } from '@/types/sale'

type IndexProps = Pick<SalesPageProps, 'products' | 'services' | 'promotions' | 'hairdressers'> & {
    sales: SaleRow[]
    shop: { id: number | string; name: string; phone?: string | null; address?: string | null }
    filters?: { q?: string; sort?: string; dir?: string; date?: string }
    daily_stats?: {
        total_vendu: number
        total_produits: number
        total_services: number
        total_ventes: number
        total_caisse: number
        total_orange_money: number
    }
    can_filter_by_date?: boolean
}

type EditPayload = NonNullable<React.ComponentProps<typeof SaleForm>['initial']>

export default function SalesIndex(props: IndexProps) {
    const { sales, shop, filters, can_filter_by_date, daily_stats: stats } = props
    const shopId = shop.id as number

    const [createOpen, setCreateOpen] = useState(false)
    const [editInitial, setEditInitial] = useState<EditPayload | null>(null)
    const [detailsOpen, setDetailsOpen] = useState(false)
    const [detailsSale, setDetailsSale] = useState<SaleRow | null>(null)

    const selectedDate = new Date(`${filters?.date ?? format(new Date(), 'yyyy-MM-dd')}T00:00:00`)

    const showTicket = (sale: SaleRow) => {
        setDetailsSale(sale)
        setDetailsOpen(true)
    }

    const handleEdit = async (row: SaleRow) => {
        try {
            const res = await fetch(salesRoutes.show.url({ shop: shopId, sale: row.id as number }), { headers: { Accept: 'application/json' } })
            if (!res.ok) {
                throw new Error(String(res.status))
            }
            setEditInitial(await res.json())
        } catch {
            toast.error("Impossible de charger la vente pour l'édition.")
        }
    }

    const handleDateChange = (date?: Date) => {
        if (date) {
            router.get(salesRoutes.index.url({ shop: shopId }), { ...filters, date: format(date, 'yyyy-MM-dd') }, {
                preserveState: true,
                only: ['sales', 'filters', 'daily_stats'],
            })
        }
    }

    return (
        <>
            <SaleLayout shopId={shop.id} sales={sales} onEditSale={handleEdit} onViewSale={showTicket}>
                <Head title="Ventes" />

                <div className="flex flex-wrap items-center gap-2">
                    <h1 className="me-auto text-xl font-semibold tracking-tight md:text-2xl">Ventes du {format(selectedDate, 'd MMMM', { locale: fr })}</h1>
                    {can_filter_by_date && (
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant="outline" aria-label="Choisir la date">
                                    <CalendarIcon />
                                    {format(selectedDate, 'dd/MM/yyyy')}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent align="end" className="w-auto p-0">
                                <Calendar mode="single" locale={fr} weekStartsOn={1} selected={selectedDate} onSelect={handleDateChange} />
                            </PopoverContent>
                        </Popover>
                    )}
                    <Button size="lg" className="px-5" onClick={() => setCreateOpen(true)}>
                        <PlusIcon />
                        Nouvelle vente
                    </Button>
                </div>

                <dl className="grid grid-cols-2 gap-3 xl:grid-cols-4">
                    <Stat label="Montant vendu" value={formatCurrency(stats?.total_vendu ?? 0)}>
                        Caisse {formatCurrency(stats?.total_caisse ?? 0)} · Orange Money {formatCurrency(stats?.total_orange_money ?? 0)}
                    </Stat>
                    <Stat label="Nombre de ventes" value={String(stats?.total_ventes ?? 0)} />
                    <Stat label="Services" value={formatCurrency(stats?.total_services ?? 0)} />
                    <Stat label="Produits" value={formatCurrency(stats?.total_produits ?? 0)} />
                </dl>
            </SaleLayout>

            <Sheet open={createOpen} onOpenChange={setCreateOpen}>
                <SheetContent className="w-full gap-0 sm:max-w-none lg:max-w-5xl">
                    <SheetHeader className="border-b">
                        <SheetTitle>Nouvelle vente</SheetTitle>
                        <SheetDescription className="sr-only">Sélectionnez les prestations puis encaissez.</SheetDescription>
                    </SheetHeader>
                    <SaleForm
                        mode="create"
                        {...props}
                        onSuccess={(sale) => {
                            setCreateOpen(false)
                            showTicket(sale)
                        }}
                    />
                </SheetContent>
            </Sheet>

            <Dialog open={editInitial !== null} onOpenChange={(open) => !open && setEditInitial(null)}>
                <DialogContent className="flex h-[92dvh] w-[96vw] max-w-5xl flex-col gap-0 overflow-hidden p-0 sm:max-w-5xl">
                    <DialogHeader className="border-b p-4">
                        <DialogTitle>Modifier la vente</DialogTitle>
                    </DialogHeader>
                    {editInitial && <SaleForm mode="edit" initial={editInitial} {...props} onDone={() => setEditInitial(null)} />}
                </DialogContent>
            </Dialog>

            <SaleDetails open={detailsOpen} onOpenChange={setDetailsOpen} sale={detailsSale} shop={shop} autoPrint />
        </>
    )
}

function Stat({ label, value, children }: { label: string; value: string; children?: React.ReactNode }) {
    return (
        <div className="rounded-xl border bg-card p-3 md:p-4">
            <dt className="text-sm text-muted-foreground">{label}</dt>
            <dd className="mt-1 text-xl font-semibold tracking-tight tabular-nums md:text-2xl">{value}</dd>
            {children && <dd className="mt-1 text-xs text-muted-foreground">{children}</dd>}
        </div>
    )
}
