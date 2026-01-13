import { Head, Link, router, usePage } from '@inertiajs/react'
import type { SalesPageProps, SaleRow } from '@/types/sale'
import AppHeaderLayout from '@/layouts/app/app-header-layout'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
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

  const fmt = (v: number) => new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 0 }).format(v).replace(/\u00A0/g, ' ') + ' F CFA'

  return (
    <AppHeaderLayout contentFullWidth contentClassName="px-26 md:px-28 mt-5">
      <Head title="Historique des ventes" />

      <div className="space-y-4">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:gap-3">
          <div className="flex-1">
            <label className="mb-1 block text-sm text-muted-foreground">Recherche</label>
            <Input
              placeholder="Reçu, client, coiffeur, produit, service…"
              value={local.q as string}
              onChange={(e) => setLocal((s) => ({ ...s, q: e.target.value }))}
            />
          </div>
          <div className="flex flex-1 gap-2">
            <div className="flex-1">
              <DateRangePicker42 label="Période" value={range} onChange={setRange} />
            </div>
          </div>
          <div className="flex items-end gap-2">
            <div>
              <label className="mb-1 block text-sm text-muted-foreground">Trier par</label>
              <Select value={local.sort} onValueChange={(v) => setLocal((s) => ({ ...s, sort: v }))}>
                <SelectTrigger className="min-w-[160px]"><SelectValue placeholder="Champ" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="sale_date">Date</SelectItem>
                  <SelectItem value="receipt_number">N° reçu</SelectItem>
                  <SelectItem value="customer_name">Client</SelectItem>
                  <SelectItem value="hairdresser_name">Coiffeur</SelectItem>
                  <SelectItem value="total_amount">Montant</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="mb-1 block text-sm text-muted-foreground">Ordre</label>
              <Select value={local.dir} onValueChange={(v) => setLocal((s) => ({ ...s, dir: v }))}>
                <SelectTrigger className="min-w-[120px]"><SelectValue placeholder="Ordre" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="asc">Ascendant</SelectItem>
                  <SelectItem value="desc">Descendant</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="mb-1 block text-sm text-muted-foreground">Par page</label>
              <Select value={local.perPage} onValueChange={(v) => setLocal((s) => ({ ...s, perPage: v }))}>
                <SelectTrigger className="min-w-[100px]"><SelectValue placeholder="Par page" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="20">20</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button className="mt-6" onClick={applyFilters}>Appliquer</Button>
          </div>
        </div>

        <div className="overflow-hidden rounded-md border bg-background p-2 md:p-3">
          <div className="mb-2 flex items-center justify-between gap-2 md:mb-3">
            <h1 className="text-base font-semibold md:text-lg">Historique des ventes</h1>
            <div className="text-sm text-muted-foreground">{sales?.total ?? 0} au total</div>
          </div>

          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="h-9 py-2">Date</TableHead>
                <TableHead className="h-9 py-2">N° reçu</TableHead>
                <TableHead className="h-9 py-2">Paiement</TableHead>
                <TableHead className="h-9 py-2">Client</TableHead>
                <TableHead className="h-9 py-2">Coiffeur</TableHead>
                <TableHead className="h-9 py-2">Produits</TableHead>
                <TableHead className="h-9 py-2">Services</TableHead>
                <TableHead className="h-9 py-2 text-right">Montant</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="py-2 text-center text-muted-foreground">Aucune vente trouvée</TableCell>
                </TableRow>
              )}
              {rows.map((r) => (
                <TableRow key={String(r.id)}>
                  <TableCell className="py-2">{format(new Date(r.sale_date), 'dd/MM/yyyy HH:mm')}</TableCell>
                  <TableCell className="py-2">{r.receipt_number ?? '—'}</TableCell>
                  <TableCell className="py-2">
                    {r.payment_method === 'orange_money' ? (
                      <span className="rounded bg-orange-100 px-1 py-0.5 text-xs font-medium text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">
                        Orange Money
                      </span>
                    ) : (
                      <span className="rounded bg-green-100 px-1 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
                        Espèces
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="py-2">{r.customer_name ?? '—'}</TableCell>
                  <TableCell className="py-2">{r.hairdresser_name ?? '—'}</TableCell>
                  <TableCell className="py-2">
                    {(() => {
                      const products = (r.details ?? []).filter((d) => d.type === 'product')
                      if (products.length === 0) return <span className="text-muted-foreground">—</span>
                      return (
                        <div className="flex flex-wrap gap-1 text-sm">
                          {products.map((p, i) => (
                            <span key={`p-${i}`} className="rounded bg-muted px-1 py-0.5">
                              {p.name}{typeof p.quantity === 'number' ? ` × ${p.quantity}` : ''}
                            </span>
                          ))}
                        </div>
                      )
                    })()}
                  </TableCell>
                  <TableCell className="py-2">
                    {(() => {
                      const services = (r.details ?? []).filter((d) => d.type === 'service')
                      if (services.length === 0) return <span className="text-muted-foreground">—</span>
                      return (
                        <div className="flex flex-wrap gap-1 text-sm">
                          {services.map((s, i) => (
                            <span key={`s-${i}`} className="rounded bg-muted px-1 py-0.5">{s.name}</span>
                          ))}
                        </div>
                      )
                    })()}
                  </TableCell>
                  <TableCell className="py-2 text-right">{fmt(Number(r.total_amount))}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {/* Pagination */}
          <div className="mt-3 flex items-center justify-between text-sm">
            <div>
              {typeof sales?.from !== 'undefined' && sales?.from !== null && sales?.to !== null ? (
                <span>Affichage {sales.from}–{sales.to} sur {sales.total}</span>
              ) : null}
            </div>
            <div className="flex items-center gap-2">
              {sales?.prev_page_url ? (
                <Link href={sales.prev_page_url} preserveScroll preserveState>Précédent</Link>
              ) : (
                <span className="text-muted-foreground">Précédent</span>
              )}
              <span>
                Page {sales?.current_page ?? 1} / {sales?.last_page ?? 1}
              </span>
              {sales?.next_page_url ? (
                <Link href={sales.next_page_url} preserveScroll preserveState>Suivant</Link>
              ) : (
                <span className="text-muted-foreground">Suivant</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </AppHeaderLayout>
  )
}
