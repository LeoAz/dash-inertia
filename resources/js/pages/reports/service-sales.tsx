import { Head, router } from '@inertiajs/react'
import ReportLayout from '@/layouts/app/report-layout'
import type { ReactNode } from 'react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import DateRangePicker42, { JsDateRange } from '@/components/comp-42'
import reportsRoutes from '@/routes/shops/reports'

type Filters = { date_from?: string | null; date_to?: string | null }

type Row = {
  service_id: number
  service_name: string
  unit_price: number
  total_count: number
  total_amount: number
}

type Props = {
  shop: { id: number | string; name?: string }
  filters: Filters
  rows: Row[]
  totals: { count_services: number; sum_count: number; sum_amount: number }
}

export default function ServiceSalesReport({ shop, filters, rows, totals }: Props) {
  const [range, setRange] = useState<JsDateRange | undefined>({
    from: filters.date_from ? new Date(filters.date_from) : undefined,
    to: filters.date_to ? new Date(filters.date_to) : undefined,
  })

  const title: ReactNode = 'Rapport: Ventes par service'

  const apply = () => {
    const query: Record<string, string> = {}
    if (range?.from) query.date_from = range.from.toISOString().slice(0, 10)
    if (range?.to) query.date_to = range.to.toISOString().slice(0, 10)
    const url = reportsRoutes.services.url({ shop: Number(shop.id) }, { query })
    router.visit(url, { preserveScroll: true, preserveState: true })
  }

  const clear = () => {
    const url = reportsRoutes.services.url({ shop: Number(shop.id) })
    router.visit(url, { preserveScroll: true, preserveState: true })
  }

  return (
    <ReportLayout shopId={shop.id} breadcrumbs={[{ title: 'Rapports', href: '#' }]} title={title}>
      <Head title="Rapport services" />

      <div className="mb-3 flex items-center gap-2">
        <DateRangePicker42 label="" value={range} onChange={setRange} />
        <Button size="sm" onClick={apply}>Filtrer</Button>
        <Button size="sm" variant="secondary" onClick={clear}>Réinitialiser</Button>
      </div>

      <div className="overflow-hidden rounded-md border bg-background">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="h-9 py-2">Service</TableHead>
              <TableHead className="h-9 py-2">PU</TableHead>
              <TableHead className="h-9 py-2">Nombre</TableHead>
              <TableHead className="h-9 py-2">Montant</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.service_id}>
                <TableCell className="py-2 font-medium">{r.service_name}</TableCell>
                <TableCell className="py-2">{formatMoney(r.unit_price)}</TableCell>
                <TableCell className="py-2">{r.total_count}</TableCell>
                <TableCell className="py-2">{formatMoney(r.total_amount)}</TableCell>
              </TableRow>
            ))}
            <TableRow className="bg-muted/30">
              <TableCell className="py-2 font-medium">Total</TableCell>
              <TableCell className="py-2" />
              <TableCell className="py-2 font-medium">{totals.sum_count}</TableCell>
              <TableCell className="py-2 font-semibold">{formatMoney(totals.sum_amount)}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </ReportLayout>
  )
}

function formatMoney(v: number): string {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', currencyDisplay: 'code', minimumFractionDigits: 0 }).format(v).replace('\u00A0XOF', ' XOF')
}
