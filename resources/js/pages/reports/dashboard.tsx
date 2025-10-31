import { Head, router } from '@inertiajs/react'
import ReportLayout from '@/layouts/app/report-layout'
import type { ReactNode } from 'react'
import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import DateRangePicker42, { JsDateRange } from '@/components/comp-42'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  BarChart,
  Bar,
  CartesianGrid,
} from 'recharts'

// Simple money formatter consistent with reports pages
function formatMoney(v: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'XOF',
    currencyDisplay: 'code',
    minimumFractionDigits: 0,
  })
    .format(v)
    .replace('\u00A0XOF', ' XOF')
}

// Props types from controller
type Filters = { date_from?: string | null; date_to?: string | null }

type RevenueByDay = { date: string; total_amount: number }

type NamedAmount = { label: string; amount: number }

type Highlights = {
  top_product: NamedAmount | null
  top_service: NamedAmount | null
  best_client: NamedAmount | null
  best_hairdresser: NamedAmount | null
}

type Props = {
  shop: { id: number | string; name?: string }
  filters: Filters
  revenue_by_day: RevenueByDay[]
  by_product: NamedAmount[]
  by_client: NamedAmount[]
  by_service: NamedAmount[]
  by_hairdresser: NamedAmount[]
  highlights?: Highlights
}

export default function ShopDashboard({ shop, filters, revenue_by_day, by_product, by_client, by_service, by_hairdresser, highlights }: Props) {
  const [range, setRange] = useState<JsDateRange | undefined>({
    from: filters.date_from ? new Date(filters.date_from) : undefined,
    to: filters.date_to ? new Date(filters.date_to) : undefined,
  })

  const title: ReactNode = 'Dashboard — Vue d\'ensemble'

  const query = useMemo(() => {
    const q: Record<string, string> = {}
    if (range?.from) q.date_from = range.from.toISOString().slice(0, 10)
    if (range?.to) q.date_to = range.to.toISOString().slice(0, 10)
    return q
  }, [range])

  const apply = () => {
    const url = `/shops/${shop.id}/dashboard`
    router.visit(url, { queryStringArrayFormat: 'indices', data: {}, only: undefined, method: 'get', preserveScroll: true, preserveState: true, headers: undefined, onStart: undefined, onProgress: undefined, onFinish: undefined, onSuccess: undefined, onError: undefined, replace: false, forceFormData: false, query })
  }

  const clear = () => {
    const url = `/shops/${shop.id}/dashboard`
    router.visit(url, { preserveScroll: true, preserveState: true })
  }

  return (
    <ReportLayout shopId={shop.id} breadcrumbs={[{ title: 'Rapports', href: '#' }]} title={title}>
      <Head title="Dashboard boutique" />

      <div className="mb-3 flex items-center gap-2">
        <DateRangePicker42 label="" value={range} onChange={setRange} />
        <Button size="sm" onClick={apply}>Filtrer</Button>
        <Button size="sm" variant="secondary" onClick={clear}>Réinitialiser</Button>
      </div>

      {/* Tableau récapitulatif */}
      <Card className="mb-3">
        <CardHeader>
          <CardTitle className="text-base">Récapitulatif des meilleurs indicateurs</CardTitle>
        </CardHeader>
        <CardContent className="overflow-hidden p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="h-9 py-2">Indicateur</TableHead>
                <TableHead className="h-9 py-2">Valeur</TableHead>
                <TableHead className="h-9 py-2 text-right">Montant</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell className="py-2 font-medium">Meilleur coiffeur</TableCell>
                <TableCell className="py-2">{highlights?.best_hairdresser?.label || '—'}</TableCell>
                <TableCell className="py-2 text-right">{highlights?.best_hairdresser ? formatMoney(highlights.best_hairdresser.amount) : '—'}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="py-2 font-medium">Meilleur client</TableCell>
                <TableCell className="py-2">{highlights?.best_client?.label || '—'}</TableCell>
                <TableCell className="py-2 text-right">{highlights?.best_client ? formatMoney(highlights.best_client.amount) : '—'}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="py-2 font-medium">Produit le plus rentable</TableCell>
                <TableCell className="py-2">{highlights?.top_product?.label || '—'}</TableCell>
                <TableCell className="py-2 text-right">{highlights?.top_product ? formatMoney(highlights.top_product.amount) : '—'}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="py-2 font-medium">Service le plus rentable</TableCell>
                <TableCell className="py-2">{highlights?.top_service?.label || '—'}</TableCell>
                <TableCell className="py-2 text-right">{highlights?.top_service ? formatMoney(highlights.top_service.amount) : '—'}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-2">
        {/* CA total (line) */}
        <Card className="col-span-1 md:col-span-2 xl:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Chiffre d\'affaires — évolution</CardTitle>
          </CardHeader>
          <CardContent className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={revenue_by_day} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis tickFormatter={(v: number) => formatMoney(v).replace(' XOF', '')} tick={{ fontSize: 12 }} width={80} />
                <Tooltip wrapperClassName="rounded-md border bg-popover text-popover-foreground shadow-md" formatter={(value: number) => [formatMoney(value), 'Montant']} labelFormatter={(l) => `Date: ${l}`} />
                <Line type="monotone" dataKey="total_amount" stroke="#16a34a" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* CA par produit (bar) */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">CA par produit</CardTitle></CardHeader>
          <CardContent className="h-[360px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={by_product} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} interval={0} angle={-30} height={60} textAnchor="end" />
                <YAxis tickFormatter={(v: number) => formatMoney(v).replace(' XOF', '')} width={70} />
                <Tooltip wrapperClassName="rounded-md border bg-popover text-popover-foreground shadow-md" formatter={(value: number) => [formatMoney(value), 'Montant']} labelFormatter={(l) => l as string} />
                <Bar dataKey="amount" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* CA par client (bar) */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">CA par client</CardTitle></CardHeader>
          <CardContent className="h-[360px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={by_client} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} interval={0} angle={-30} height={60} textAnchor="end" />
                <YAxis tickFormatter={(v: number) => formatMoney(v).replace(' XOF', '')} width={70} />
                <Tooltip wrapperClassName="rounded-md border bg-popover text-popover-foreground shadow-md" formatter={(value: number) => [formatMoney(value), 'Montant']} labelFormatter={(l) => l as string} />
                <Bar dataKey="amount" fill="#8b5cf6" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* CA par service (line) */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">CA par service</CardTitle></CardHeader>
          <CardContent className="h-[360px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={by_service} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} interval={0} angle={-30} height={60} textAnchor="end" />
                <YAxis tickFormatter={(v: number) => formatMoney(v).replace(' XOF', '')} width={70} />
                <Tooltip wrapperClassName="rounded-md border bg-popover text-popover-foreground shadow-md" formatter={(value: number) => [formatMoney(value), 'Montant']} labelFormatter={(l) => l as string} />
                <Bar dataKey="amount" fill="#f59e0b" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* CA par coiffeur (bar) */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">CA par coiffeur</CardTitle></CardHeader>
          <CardContent className="h-[360px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={by_hairdresser} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} interval={0} angle={-30} height={60} textAnchor="end" />
                <YAxis tickFormatter={(v: number) => formatMoney(v).replace(' XOF', '')} width={70} />
                <Tooltip wrapperClassName="rounded-md border bg-popover text-popover-foreground shadow-md" formatter={(value: number) => [formatMoney(value), 'Montant']} labelFormatter={(l) => l as string} />
                <Bar dataKey="amount" fill="#10b981" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </ReportLayout>
  )
}
