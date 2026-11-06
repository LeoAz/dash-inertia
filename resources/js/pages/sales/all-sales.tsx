import { Head, Link, router, usePage } from '@inertiajs/react'
import type { SalesPageProps, SaleRow } from '@/types/sale'
import AppHeaderLayout from '@/layouts/app/app-header-layout'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import SaleDetails from '@/components/sales/sale-details'
import { SaleCard } from '@/components/sales/sale-card'
import { PrinterIcon } from 'lucide-react'
import { format } from 'date-fns'
import DateRangePicker42, { JsDateRange } from '@/components/comp-42'
import { useMemo, useState } from 'react'

export default function AllSalesPage() {
  const page = usePage<{ sales: SalesPageProps['sales']; filters: SalesPageProps['filters']; shop: SalesPageProps['shop'] }>()

  const sales = page.props.sales
  const filters = page.props.filters ?? {}
  const shop = page.props.shop

  const [local, setLocal] = useState({
    q: filters.q ?? '',
    sort: (filters.sort as string) ?? 'sale_date',
    dir: (filters.dir as string) ?? 'desc',
    perPage: String(filters.perPage ?? 20),
  })

  const initialRange: JsDateRange = {
    from: filters.date_from ? new Date(filters.date_from) : undefined,
    to: filters.date_to ? new Date(filters.date_to) : undefined,
  }
  const [range, setRange] = useState<JsDateRange | undefined>(initialRange)

  const [ticket, setTicket] = useState<SaleRow | null>(null)

  const rows: SaleRow[] = useMemo(() => {
    return (sales?.data ?? []) as unknown as SaleRow[]
  }, [sales])

  const applyFilters = () => {
    const url = `/shops/${shop.id}/sales/history`
    const date_from = range?.from ? format(range.from, 'yyyy-MM-dd') : undefined
    const date_to = range?.to ? format(range.to, 'yyyy-MM-dd') : undefined

    router.visit(url, {
      method: 'get',
      only: ['sales', 'filters', 'shop'],
      preserveState: true,
      preserveScroll: true,
      data: {
        q: local.q || undefined,
        sort: local.sort || undefined,
        dir: local.dir || undefined,
        perPage: local.perPage,
        date_from,
        date_to,
      },
    })
  }


  return (
    <AppHeaderLayout>
      <Head title="Historique des ventes" />

      <div className="flex items-baseline justify-between gap-2">
        <h1 className="text-xl font-semibold tracking-tight md:text-2xl">Historique des ventes</h1>
        <span className="text-sm text-muted-foreground">{sales?.total ?? 0} au total</span>
      </div>

      <div className="grid grid-cols-2 items-end gap-3 rounded-xl border bg-card p-3 md:grid-cols-4 xl:grid-cols-[2fr_2fr_1fr_1fr_auto_auto]">
        <div className="col-span-2 grid gap-1.5">
          <Label htmlFor="history-search">Recherche</Label>
          <Input
            id="history-search"
            placeholder="Reçu, client, coiffeur, produit, service…"
            value={local.q as string}
            onChange={(e) => setLocal((s) => ({ ...s, q: e.target.value }))}
          />
        </div>
        <div className="col-span-2 xl:col-span-1">
          <DateRangePicker42 label="Période" value={range} onChange={setRange} />
        </div>
        <div className="grid gap-1.5">
          <Label>Trier par</Label>
          <Select value={local.sort} onValueChange={(v) => setLocal((s) => ({ ...s, sort: v }))}>
            <SelectTrigger className="w-full"><SelectValue placeholder="Champ" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="sale_date">Date</SelectItem>
              <SelectItem value="receipt_number">N° reçu</SelectItem>
              <SelectItem value="customer_name">Client</SelectItem>
              <SelectItem value="hairdresser_name">Coiffeur</SelectItem>
              <SelectItem value="total_amount">Montant</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-1.5">
          <Label>Ordre</Label>
          <Select value={local.dir} onValueChange={(v) => setLocal((s) => ({ ...s, dir: v }))}>
            <SelectTrigger className="w-full"><SelectValue placeholder="Ordre" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="desc">Décroissant</SelectItem>
              <SelectItem value="asc">Croissant</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-1.5">
          <Label>Par page</Label>
          <Select value={local.perPage} onValueChange={(v) => setLocal((s) => ({ ...s, perPage: v }))}>
            <SelectTrigger className="w-full"><SelectValue placeholder="Par page" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="20">20</SelectItem>
              <SelectItem value="50">50</SelectItem>
              <SelectItem value="100">100</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button onClick={applyFilters}>Appliquer</Button>
      </div>

      {rows.length === 0 ? (
        <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">Aucune vente trouvée</p>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {rows.map((r) => (
            <SaleCard
              key={String(r.id)}
              sale={r}
              dateFormat="dd/MM/yyyy HH:mm"
              actions={
                <Button variant="outline" size="icon" onClick={() => setTicket(r)} aria-label="Voir le reçu">
                  <PrinterIcon />
                </Button>
              }
            />
          ))}
        </div>
      )}

      <div className="flex items-center justify-between gap-2 text-sm">
        <Button asChild={Boolean(sales?.prev_page_url)} variant="outline" disabled={!sales?.prev_page_url}>
          {sales?.prev_page_url ? <Link href={sales.prev_page_url} preserveScroll preserveState>Précédent</Link> : <span>Précédent</span>}
        </Button>
        <span className="text-muted-foreground">Page {sales?.current_page ?? 1} / {sales?.last_page ?? 1}</span>
        <Button asChild={Boolean(sales?.next_page_url)} variant="outline" disabled={!sales?.next_page_url}>
          {sales?.next_page_url ? <Link href={sales.next_page_url} preserveScroll preserveState>Suivant</Link> : <span>Suivant</span>}
        </Button>
      </div>

      <SaleDetails open={ticket !== null} onOpenChange={(open) => !open && setTicket(null)} sale={ticket} shop={shop} />
    </AppHeaderLayout>
  )
}
