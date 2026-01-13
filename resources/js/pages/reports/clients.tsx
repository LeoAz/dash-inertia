import { Head, router } from '@inertiajs/react'
import ReportLayout from '@/layouts/app/report-layout'
import type { ReactNode } from 'react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import DateRangePicker42, { JsDateRange } from '@/components/comp-42'
import reportsRoutes from '@/routes/shops/reports'
import { Printer, FileSpreadsheet } from 'lucide-react'

type Filters = { date_from?: string | null; date_to?: string | null }

type Row = {
  customer_name: string
  orders_count: number
  total_spent: number
}

type Props = {
  shop: { id: number | string; name?: string }
  filters: Filters
  rows: Row[]
  totals: { count_clients: number; sum_orders: number; sum_amount: number }
}

export default function ClientsReport({ shop, filters, rows, totals }: Props) {
  const [range, setRange] = useState<JsDateRange | undefined>({
    from: filters.date_from ? new Date(filters.date_from) : undefined,
    to: filters.date_to ? new Date(filters.date_to) : undefined,
  })

  const title: ReactNode = 'Rapport: Clients'

  const apply = () => {
    const query: Record<string, string> = {}
    if (range?.from) query.date_from = range.from.toISOString().slice(0, 10)
    if (range?.to) query.date_to = range.to.toISOString().slice(0, 10)
    const url = reportsRoutes.clients.url({ shop: Number(shop.id) }, { query })
    router.visit(url, { preserveScroll: true, preserveState: true })
  }

  const clear = () => {
    const url = reportsRoutes.clients.url({ shop: Number(shop.id) })
    router.visit(url, { preserveScroll: true, preserveState: true })
  }

  const exportExcel = () => {
    const query: Record<string, string> = {}
    if (range?.from) query.date_from = range.from.toISOString().slice(0, 10)
    if (range?.to) query.date_to = range.to.toISOString().slice(0, 10)
    window.location.href = reportsRoutes.clients.export.url({ shop: Number(shop.id) }, { query })
  }

  const printReport = () => {
    window.print()
  }

  const dateFromStr = filters.date_from ? new Date(filters.date_from).toLocaleDateString('fr-FR') : null
  const dateToStr = filters.date_to ? new Date(filters.date_to).toLocaleDateString('fr-FR') : null
  const dateRangeStr = dateFromStr && dateToStr
    ? `Période du ${dateFromStr} au ${dateToStr}`
    : dateFromStr
      ? `Depuis le ${dateFromStr}`
      : dateToStr
        ? `Jusqu'au ${dateToStr}`
        : 'Tous les clients'

  return (
    <ReportLayout shopId={shop.id} breadcrumbs={[{ title: 'Rapports', href: '#' }]} title={title}>
      <Head title="Rapport clients" />

      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body * { visibility: hidden; }
          .print-section, .print-section * { visibility: visible; }
          .print-section { position: absolute; left: 0; top: 0; width: 100%; }
          @page { margin: 1cm; }
        }
      `}} />

      {/* Template d'impression professionnel */}
      <div className="print-section hidden flex-col gap-6 bg-white p-8 text-black print:flex">
        <div className="flex items-start justify-between border-b pb-6">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-3">
              <img src="/img/logo%201.png" alt="Logo" className="h-12 w-auto object-contain" />
              <h2 className="text-2xl font-bold uppercase tracking-tight">{shop.name || 'Dash Shop'}</h2>
            </div>
            <p className="text-sm text-gray-600">Rapport de fidélité clients</p>
          </div>
          <div className="text-right">
            <h1 className="text-xl font-bold uppercase text-primary">Rapport Clients</h1>
            <p className="mt-1 text-sm font-medium text-gray-500">{dateRangeStr}</p>
            <p className="mt-4 text-xs text-gray-400">Généré le {new Date().toLocaleString('fr-FR')}</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="rounded-lg border border-gray-100 bg-gray-50/50 p-4">
            <p className="text-xs font-medium uppercase text-gray-500">Clients</p>
            <p className="mt-1 text-2xl font-bold">{totals.count_clients}</p>
          </div>
          <div className="rounded-lg border border-gray-100 bg-gray-50/50 p-4">
            <p className="text-xs font-medium uppercase text-gray-500">Total Commandes</p>
            <p className="mt-1 text-2xl font-bold">{totals.sum_orders}</p>
          </div>
          <div className="rounded-lg border border-gray-100 bg-gray-50/50 p-4">
            <p className="text-xs font-medium uppercase text-gray-500">Chiffre d'Affaires</p>
            <p className="mt-1 text-2xl font-bold text-primary">{formatMoney(totals.sum_amount)}</p>
          </div>
        </div>

        <div className="mt-4">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b-2 border-gray-200 bg-gray-50 text-left">
                <th className="px-4 py-3 text-sm font-bold uppercase text-gray-700">Client</th>
                <th className="px-4 py-3 text-center text-sm font-bold uppercase text-gray-700">Commandes</th>
                <th className="px-4 py-3 text-right text-sm font-bold uppercase text-gray-700">Total Dépensé</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, idx) => (
                <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50/50">
                  <td className="px-4 py-3 text-sm font-medium">{r.customer_name}</td>
                  <td className="px-4 py-3 text-center text-sm">{r.orders_count}</td>
                  <td className="px-4 py-3 text-right text-sm font-semibold">{formatMoney(r.total_spent)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-gray-50 font-bold">
                <td className="px-4 py-4 text-sm uppercase">Total Général</td>
                <td className="px-4 py-4 text-center text-sm">{totals.sum_orders}</td>
                <td className="px-4 py-4 text-right text-lg text-primary">{formatMoney(totals.sum_amount)}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div className="mt-auto grid grid-cols-2 gap-12 pt-12">
          <div className="flex flex-col items-center gap-20">
            <p className="text-sm font-bold uppercase underline">Cachet et Signature</p>
            <div className="h-24 w-48 border-2 border-dashed border-gray-200"></div>
          </div>
          <div className="flex flex-col items-center gap-20">
            <p className="text-sm font-bold uppercase underline">Visa Direction</p>
            <div className="h-24 w-48 border-2 border-dashed border-gray-200"></div>
          </div>
        </div>

        <div className="mt-8 border-t pt-4 text-center text-[10px] text-gray-400">
          <p>Ce document est un rapport officiel de Dash Shop. Toute altération est passible de poursuites.</p>
        </div>
      </div>

      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 print:hidden">
        <div className="flex items-center gap-2">
          <DateRangePicker42 label="" value={range} onChange={setRange} />
          <Button size="sm" onClick={apply}>Filtrer</Button>
          <Button size="sm" variant="secondary" onClick={clear}>Réinitialiser</Button>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={printReport}>
            <Printer className="mr-2 h-4 w-4" />
            Imprimer
          </Button>
          <Button size="sm" variant="outline" onClick={exportExcel}>
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            Excel
          </Button>
        </div>
      </div>

      <div className="overflow-hidden rounded-md border bg-background print:hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="h-9 py-2">Client</TableHead>
              <TableHead className="h-9 py-2 text-center">Commandes</TableHead>
              <TableHead className="h-9 py-2 text-right">Montant</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r, idx) => (
              <TableRow key={idx}>
                <TableCell className="py-2 font-medium">{r.customer_name}</TableCell>
                <TableCell className="py-2 text-center">{r.orders_count}</TableCell>
                <TableCell className="py-2 text-right">{formatMoney(r.total_spent)}</TableCell>
              </TableRow>
            ))}
            <TableRow className="bg-muted/30">
              <TableCell className="py-2 font-medium">Total</TableCell>
              <TableCell className="py-2 text-center font-medium">{totals.sum_orders}</TableCell>
              <TableCell className="py-2 text-right font-semibold">{formatMoney(totals.sum_amount)}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </ReportLayout>
  )
}

function formatMoney(v: number): string {
  return new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 0 }).format(v).replace(/\u00A0/g, ' ') + ' F CFA'
}
