import { Head, router } from '@inertiajs/react'
import ReportLayout from '@/layouts/app/report-layout'
import type { ReactNode } from 'react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import DateRangePicker42, { JsDateRange } from '@/components/comp-42'
import reportsRoutes from '@/routes/shops/reports'
import { Printer } from 'lucide-react'

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
        : 'Toutes les ventes'

  return (
    <ReportLayout shopId={shop.id} breadcrumbs={[{ title: 'Rapports', href: '#' }]} title={title}>
      <Head title="Rapport services" />

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
            <p className="text-sm text-gray-600">Rapport de performance des services</p>
          </div>
          <div className="text-right">
            <p className="text-sm font-semibold uppercase text-gray-500">Document Officiel</p>
            <p className="text-lg font-bold">{new Date().toLocaleDateString('fr-FR')}</p>
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-bold text-gray-900">RAPPORT DES VENTES PAR SERVICE</h1>
          <p className="text-gray-600">{dateRangeStr}</p>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="rounded-lg border p-4">
            <p className="text-xs font-medium uppercase text-gray-500">Services vendus</p>
            <p className="text-2xl font-bold">{totals.count_services}</p>
          </div>
          <div className="rounded-lg border p-4">
            <p className="text-xs font-medium uppercase text-gray-500">Volume total</p>
            <p className="text-2xl font-bold">{totals.sum_count}</p>
          </div>
          <div className="rounded-lg border p-4 bg-gray-50">
            <p className="text-xs font-medium uppercase text-gray-500 text-primary">Chiffre d'affaires</p>
            <p className="text-2xl font-bold text-primary">{formatMoney(totals.sum_amount)}</p>
          </div>
        </div>

        <table className="w-full text-left text-sm">
          <thead className="border-y bg-gray-50 text-xs font-semibold uppercase text-gray-700">
            <tr>
              <th className="px-4 py-3">Désignation du Service</th>
              <th className="px-4 py-3 text-right">Prix Unitaire</th>
              <th className="px-4 py-3 text-center">Nombre</th>
              <th className="px-4 py-3 text-right">Montant Total</th>
            </tr>
          </thead>
          <tbody className="divide-y border-b">
            {rows.map((r) => (
              <tr key={r.service_id} className="hover:bg-gray-50/50">
                <td className="px-4 py-3 font-medium text-gray-900">{r.service_name}</td>
                <td className="px-4 py-3 text-right text-gray-600">{formatMoney(r.unit_price)}</td>
                <td className="px-4 py-3 text-center text-gray-600">{r.total_count}</td>
                <td className="px-4 py-3 text-right font-semibold text-gray-900">{formatMoney(r.total_amount)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-gray-50/50 font-bold">
            <tr>
              <td colSpan={2} className="px-4 py-4 text-right uppercase text-gray-500">Total Général</td>
              <td className="px-4 py-4 text-center text-gray-900 border-t-2 border-gray-900">{totals.sum_count}</td>
              <td className="px-4 py-4 text-right text-primary text-lg border-t-2 border-gray-900">{formatMoney(totals.sum_amount)}</td>
            </tr>
          </tfoot>
        </table>

        <div className="mt-8 grid grid-cols-2 gap-12">
          <div className="h-32 rounded-lg border border-dashed border-gray-300 p-4">
            <p className="text-xs font-bold uppercase text-gray-400">Cachet & Signature Boutique</p>
          </div>
          <div className="h-32 rounded-lg border border-dashed border-gray-300 p-4">
            <p className="text-xs font-bold uppercase text-gray-400">Visa Responsable</p>
          </div>
        </div>

        <div className="mt-auto pt-8 text-center text-[10px] text-gray-400 border-t">
          <p>Ce document est une pièce justificative de vente générée par le système de gestion Dash Shop.</p>
        </div>
      </div>

      <div className="mb-3 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div className="flex items-center gap-2">
          <DateRangePicker42 label="" value={range} onChange={setRange} />
          <Button size="sm" onClick={apply}>Filtrer</Button>
          <Button size="sm" variant="secondary" onClick={clear}>Réinitialiser</Button>
        </div>

        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" className="gap-2" onClick={printReport}>
            <Printer className="h-4 w-4" />
            Imprimer
          </Button>
        </div>
      </div>

      <div className="overflow-hidden rounded-md border bg-background print:hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="h-9 py-2">Service</TableHead>
              <TableHead className="h-9 py-2 text-right">PU</TableHead>
              <TableHead className="h-9 py-2 text-center">Nombre</TableHead>
              <th className="h-9 py-2 pr-4 text-right">Montant</th>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.service_id}>
                <TableCell className="py-2 font-medium">{r.service_name}</TableCell>
                <TableCell className="py-2 text-right">{formatMoney(r.unit_price)}</TableCell>
                <TableCell className="py-2 text-center">{r.total_count}</TableCell>
                <TableCell className="py-2 text-right">{formatMoney(r.total_amount)}</TableCell>
              </TableRow>
            ))}
            <TableRow className="bg-muted/30">
              <TableCell className="py-2 font-medium">Total</TableCell>
              <TableCell className="py-2" />
              <TableCell className="py-2 text-center font-medium">{totals.sum_count}</TableCell>
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
