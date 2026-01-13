import { Head, router, usePage } from '@inertiajs/react'
import type { SalesPageProps, SaleRow } from '@/types/sale'
import SaleLayout from '@/layouts/app/sale-layout'
import SaleDetails from '@/components/sales/sale-details'
import { useMemo, useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import SaleForm from '@/components/sales/sale-form'
import { Calendar } from '@/components/ui/calendar'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import salesRoutes from '@/routes/shops/sales/index'
import { fr } from 'date-fns/locale'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function SalesIndex(props: SalesPageProps) {
  const { sales, shop, filters, can_filter_by_date } = props

  const [editOpen, setEditOpen] = useState(false)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [detailsSale, setDetailsSale] = useState<SaleRow | null>(null)
  const [createOpen, setCreateOpen] = useState(false)

  const [currentDate, setCurrentDate] = useState<string>(filters?.date || new Date().toISOString().slice(0, 10))

  // Sur tablette (<lg), on masque la liste par défaut et on affiche un bouton pour basculer
  const [showSalesList, setShowSalesList] = useState(false)
  type SaleShowPayload = {
    id: number | string
    customer_name?: string
    customer_phone?: string
    sale_date?: string
    payment_method?: 'orange_money' | 'caisse'
    promotion_id?: number | null
    products?: { product_id: number; quantity: number }[]
    services?: { service_id: number }[]
  }
  const [editInitial, setEditInitial] = useState<SaleShowPayload | null>(null)

  // Map API pagination rows to SaleLayout rows
  const rows: SaleRow[] = useMemo(() => {
    return (sales?.data ?? []).map((s) => ({
      id: s.id,
      receipt_number: s.receipt_number ?? undefined,
      customer_name: s.customer_name ?? undefined,
      hairdresser_name: s.hairdresser_name ?? undefined,
      total_amount: s.total_amount ?? 0,
      sale_date: s.sale_date,
      promotion_applied: Boolean(s.promotion_applied),
      promotion_label: s.promotion_label ?? undefined,
      details: s.details ?? [],
    }))
  }, [sales])

  const handleEdit = async (row: SaleRow) => {
    try {
      const shopId = typeof shop.id === 'object' ? (shop.id as any).id : (shop.id as any)
      const url = salesRoutes.show.url({ shop: shopId, sale: row.id as any })
      const res = await fetch(url, { headers: { 'Accept': 'application/json' } })
      if (res.ok) {
        const data = await res.json()
        setEditInitial(data)
        setEditOpen(true)
      } else {
        toast.error("Impossible de charger la vente pour l'édition.")
      }
    } catch (e) {
      console.error(e)
      toast.error("Une erreur est survenue lors du chargement.")
    }
  }

  // Statistiques du jour (sur la liste déjà filtrée "du jour")
  const stats = useMemo(() => {
    const totalVendu = rows.reduce((s, r) => s + Number(r.total_amount ?? 0), 0)
    let totalProduits = 0
    let totalServices = 0
    for (const r of rows) {
      for (const d of r.details ?? []) {
        if (d.type === 'product') {
          totalProduits += Number(d.line_subtotal ?? (Number(d.unit_price ?? d.price ?? 0) * Number(d.quantity ?? 1)))
        } else if (d.type === 'service') {
          totalServices += Number(d.price ?? d.line_subtotal ?? 0)
        }
      }
    }
    return { totalVendu, totalProduits, totalServices }
  }, [rows])

  const handleDateChange = (date: Date | undefined) => {
    if (!date) return
    const iso = date.toISOString().slice(0, 10)
    const shopId = typeof shop.id === 'object' ? (shop.id as any).id : (shop.id as any)
    router.get(salesRoutes.index.url({ shop: shopId }), {
      ...filters,
      date: iso,
    }, {
      preserveState: true,
      only: ['sales', 'filters'],
    })
  }

  const fmt = (v: number) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', minimumFractionDigits: 0 }).format(v)

  return (
    <>
      <SaleLayout
        shopId={shop?.id}
        breadcrumbs={[{ title: 'Ventes', href: '#' }]}
        title={undefined}
        sales={rows}
        onEditSale={handleEdit}
        onViewSale={(row) => { setDetailsSale(row); setDetailsOpen(true); }}
        showSalesOnTablet={showSalesList}
        onToggleSalesOnTablet={() => setShowSalesList(v => !v)}
      >
        <Head title="Ventes" />
        {/* Barre d’actions en haut de la page */}
        <div className="mb-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Button type="button" onClick={() => setCreateOpen(true)}>Nouvelle vente</Button>

            {can_filter_by_date && (
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="flex items-center gap-2">
                    <span className="hidden sm:inline">Ventes du :</span>
                    {new Date(currentDate + 'T00:00:00').toLocaleDateString('fr-FR')}
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="start" className="w-auto p-0">
                  <Calendar
                    mode="single"
                    locale={fr}
                    weekStartsOn={1 as any}
                    selected={new Date(currentDate + 'T00:00:00')}
                    onSelect={(d) => {
                      if (d) {
                        const iso = d.toISOString().slice(0, 10)
                        setCurrentDate(iso)
                        handleDateChange(d)
                      }
                    }}
                  />
                </PopoverContent>
              </Popover>
            )}
          </div>
          {/* Bouton alternance sur tablette si nécessaire */}
          <Button type="button" className="lg:hidden" variant="outline" onClick={() => setShowSalesList(v => !v)}>
            {showSalesList ? 'Créer une vente' : (can_filter_by_date && filters?.date !== new Date().toISOString().slice(0, 10)) ? `Voir ventes du ${format(new Date(currentDate + 'T00:00:00'), 'dd-MM-yyyy', { locale: fr })}` : 'Voir ventes du jour'}
          </Button>
        </div>

        {/* Stats cards */}
        <div className="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Card>
            <CardHeader className="py-3"><CardTitle className="text-sm">Montant total vendu</CardTitle></CardHeader>
            <CardContent className="pb-3 text-xl font-semibold">{fmt(stats.totalVendu)}</CardContent>
          </Card>
          <Card>
            <CardHeader className="py-3"><CardTitle className="text-sm">Montant total produits</CardTitle></CardHeader>
            <CardContent className="pb-3 text-xl font-semibold">{fmt(stats.totalProduits)}</CardContent>
          </Card>
          <Card>
            <CardHeader className="py-3"><CardTitle className="text-sm">Montant total services</CardTitle></CardHeader>
            <CardContent className="pb-3 text-xl font-semibold">{fmt(stats.totalServices)}</CardContent>
          </Card>
        </div>
      </SaleLayout>

      {/* Sheet de création de vente */}
      <Sheet open={createOpen} onOpenChange={setCreateOpen}>
        <SheetContent className="sm:max-w-3xl w-[96vw] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Créer une vente</SheetTitle>
          </SheetHeader>
          <div className="py-4 px-4">
            <SaleForm
              mode="create"
              {...props}
              onSuccess={(fresh) => {
                setCreateOpen(false)
                setDetailsSale(fresh)
                setDetailsOpen(true)
              }}
            />
          </div>
        </SheetContent>
      </Sheet>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Modifier la vente</DialogTitle>
          </DialogHeader>
          {editInitial && (
            <div className="pb-4">
              <SaleForm
                mode="edit"
                initial={editInitial}
                {...props}
                onDone={() => {
                  setEditOpen(false)
                  setEditInitial(null)
                }}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>

      <SaleDetails open={detailsOpen} onOpenChange={setDetailsOpen} sale={detailsSale} shop={shop} autoPrint={true} />
    </>
  )
}

// ————————————————————————————————————————————————
// Formulaire de vente partagé (création et édition), avec DatePicker FR
// ————————————————————————————————————————————————

type ProductLine = { product_id: number; quantity: number }
type ServiceLine = { service_id: number }

type SaleFormProps = SalesPageProps & {
  mode: 'create' | 'edit'
  initial?: {
    id?: number | string
    customer_name?: string
    customer_phone?: string
    sale_date?: string // YYYY-MM-DD
    hairdresser_id?: number | null
    promotion_id?: number | null
    products?: ProductLine[]
    services?: ServiceLine[]
  }
  onDone?: () => void
}

function SaleFormLegacy({ mode, initial, onDone, products: productOptions, services: serviceOptions, promotions: promoOptions, hairdressers, shop }: SaleFormProps) {
  const page = usePage()
  const errors = (page.props as unknown as { errors?: Record<string, string> })?.errors ?? {}

  const [customerName, setCustomerName] = useState<string>(initial?.customer_name ?? '')
  const [customerPhone, setCustomerPhone] = useState<string>(initial?.customer_phone ?? '')
  const [saleDate, setSaleDate] = useState<string>(initial?.sale_date ?? new Date().toISOString().slice(0,10))
  const [hairdresserId, setHairdresserId] = useState<string>(initial?.hairdresser_id ? String(initial.hairdresser_id) : '')

  const [selectedProductId, setSelectedProductId] = useState<string>('')
  const [productQty, setProductQty] = useState<number>(1)
  const [productLines, setProductLines] = useState<ProductLine[]>(initial?.products ?? [])

  const [selectedServiceId, setSelectedServiceId] = useState<string>('')
  const [serviceLines, setServiceLines] = useState<ServiceLine[]>(initial?.services ?? [])

  const [addPromotion, setAddPromotion] = useState<boolean>(Boolean(initial?.promotion_id))
  const [selectedPromotionId, setSelectedPromotionId] = useState<string>(initial?.promotion_id ? String(initial?.promotion_id) : '')

  // Autocomplete supprimé pour Nom et Téléphone (inputs simples)

  // Si les données initiales changent (ouverture du modal), ré-initialiser le state
  useEffect(() => {
    if (initial) {
      setCustomerName(initial.customer_name ?? '')
      setCustomerPhone(initial.customer_phone ?? '')
      setSaleDate(initial.sale_date ?? new Date().toISOString().slice(0,10))
      setProductLines(initial.products ?? [])
      setServiceLines(initial.services ?? [])
      setAddPromotion(Boolean(initial.promotion_id))
      setSelectedPromotionId(initial.promotion_id ? String(initial.promotion_id) : '')
      setHairdresserId(initial.hairdresser_id ? String(initial.hairdresser_id) : '')
    }
  }, [initial?.id])

  const findProduct = (id?: number) => productOptions.find(p => p.id === id)
  const findService = (id?: number) => serviceOptions.find(s => s.id === id)
  const findPromotion = (id?: number) => promoOptions.find(p => p.id === id)

  const productsSubtotal = useMemo(() => {
    return productLines.reduce((sum, line) => {
      const p = findProduct(line.product_id)
      const unit = p?.price ?? 0
      return sum + unit * (line.quantity || 1)
    }, 0)
  }, [productLines, productOptions])

  const servicesSubtotal = useMemo(() => {
    return serviceLines.reduce((sum, line) => {
      const s = findService(line.service_id)
      const unit = s?.price ?? 0
      return sum + unit
    }, 0)
  }, [serviceLines, serviceOptions])

  const grossTotal = useMemo(() => {
    return Math.round((productsSubtotal + servicesSubtotal) * 100) / 100
  }, [productsSubtotal, servicesSubtotal])

  const discount = useMemo(() => {
    if (!addPromotion || !selectedPromotionId) return 0
    const promo = findPromotion(Number(selectedPromotionId))
    if (!promo || !promo.active) return 0

    let eligibleBase = 0
    if (promo.applicable_to_products) eligibleBase += productsSubtotal
    if (promo.applicable_to_services) eligibleBase += servicesSubtotal
    if (eligibleBase <= 0) return 0

    const pct = promo.percentage || 0
    const amt = promo.amount || 0

    let d = 0
    if (pct > 0) {
      d = (pct / 100) * eligibleBase
    } else if (amt > 0) {
      d = Math.min(amt, eligibleBase)
    }
    return Math.round(d * 100) / 100
  }, [addPromotion, selectedPromotionId, productsSubtotal, servicesSubtotal, promoOptions])

  const grandTotal = useMemo(() => {
    const val = Math.max(0, grossTotal - discount)
    return Math.round(val * 100) / 100
  }, [grossTotal, discount])

  const addProduct = () => {
    const id = Number(selectedProductId)
    if (!id || !findProduct(id)) return
    const qty = Math.max(1, Number(productQty) || 1)
    setProductLines(prev => [...prev, { product_id: id, quantity: qty }])
    setSelectedProductId('')
    setProductQty(1)
  }

  const removeProduct = (index: number) => {
    setProductLines(prev => prev.filter((_, i) => i !== index))
  }

  const addService = () => {
    const id = Number(selectedServiceId)
    if (!id || !findService(id)) return
    setServiceLines(prev => [...prev, { service_id: id }])
    setSelectedServiceId('')
  }

  const removeService = (index: number) => {
    setServiceLines(prev => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const shopId = typeof shop.id === 'object' ? (shop.id as any).id : (shop.id as any)
    if (mode === 'create') {
      const url = salesRoutes.index.url({ shop: shopId })
      const payload = {
        customer_name: customerName,
        customer_phone: customerPhone,
        sale_date: saleDate,
        hairdresser_id: hairdresserId ? Number(hairdresserId) : null,
        products: productLines,
        services: serviceLines,
        ...(addPromotion && selectedPromotionId ? { promotion_id: Number(selectedPromotionId) } : {}),
      }
      router.post(url, payload, {
        onSuccess: () => {
          toast.success('Vente créée avec succès.')
          // Reset form création
          setCustomerName('')
          setCustomerPhone('')
          setSaleDate(new Date().toISOString().slice(0,10))
          setProductLines([])
          setServiceLines([])
          setAddPromotion(false)
          setSelectedPromotionId('')
          setHairdresserId('')
          router.reload({ only: ['sales'] })
        },
        onError: (errs) => {
          const values = Object.values(errs ?? {})
          if (values.length === 0) { toast.error('Une erreur est survenue.'); return }
          values.forEach((msg) => {
            if (msg) { toast.error(String(msg)) }
          })
        }
      })
    } else {
      const url = salesRoutes.update.url({ shop: shopId, sale: initial?.id as any })
      const payload = {
        customer_name: customerName,
        customer_phone: customerPhone,
        sale_date: saleDate,
        hairdresser_id: hairdresserId ? Number(hairdresserId) : null,
        products: productLines,
        services: serviceLines,
        ...(addPromotion && selectedPromotionId ? { promotion_id: Number(selectedPromotionId) } : { promotion_id: null }),
      }
      router.patch(url, payload, {
        onSuccess: () => {
          toast.success('Vente mise à jour avec succès.')
          onDone?.()
          router.reload({ only: ['sales'] })
        },
        onError: (errs) => {
          const values = Object.values(errs ?? {})
          if (values.length === 0) { toast.error('Une erreur est survenue.'); return }
          values.forEach((msg) => {
            if (msg) { toast.error(String(msg)) }
          })
        }
      })
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="rounded-md border">
        <div className="border-b px-3 py-2">
          <h3 className="text-sm font-medium">Infos client</h3>
        </div>
        <div className="grid gap-3 p-3 md:grid-cols-2">
          <div>
            <Input
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Nom du client"
              aria-label="Nom du client"
              autoComplete="off"
            />
            {errors.customer_name && <div className="mt-1 text-xs text-destructive">{String(errors.customer_name)}</div>}
          </div>
          <div>
            <Input
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              placeholder="Téléphone"
              aria-label="Téléphone"
              autoComplete="off"
              inputMode="tel"
            />
            {errors.customer_phone && <div className="mt-1 text-xs text-destructive">{String(errors.customer_phone)}</div>}
          </div>
          <div>
            <Popover>
              <PopoverTrigger asChild>
                <Button type="button" variant="outline" className="w-full justify-between">
                  {saleDate ? new Date(saleDate + 'T00:00:00').toLocaleDateString('fr-FR') : 'Sélectionner une date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent align="start" className="p-0">
                <Calendar
                  mode="single"
                  locale={fr}
                  weekStartsOn={1 as any}
                  selected={saleDate ? new Date(saleDate + 'T00:00:00') : undefined}
                  onSelect={(d) => {
                    if (d) {
                      const iso = d.toISOString().slice(0,10)
                      setSaleDate(iso)
                    }
                  }}
                />
              </PopoverContent>
            </Popover>
            {errors.sale_date && <div className="mt-1 text-xs text-destructive">{String(errors.sale_date)}</div>}
          </div>
          {/* Le choix du coiffeur est déplacé dans une section dédiée sous Produits */}
        </div>
      </div>

      {/* Services avant Produits */}
      <div className="rounded-md border">
        <div className="border-b px-3 py-2">
          <h3 className="text-sm font-medium">Services</h3>
        </div>
        <div className="space-y-3 p-3">
          <div className="flex flex-wrap items-end gap-2">
            <div className="min-w-[220px] grow">
              <Select value={selectedServiceId} onValueChange={(v) => setSelectedServiceId(v)}>
                <SelectTrigger aria-label="Service">
                  <SelectValue placeholder="Sélectionner un service" />
                </SelectTrigger>
                <SelectContent>
                  {serviceOptions.map((s) => (
                    <SelectItem key={s.id} value={String(s.id)}>{s.name} — {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF' }).format(s.price)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors['services.0.service_id'] && <div className="mt-1 text-xs text-destructive">{String(errors['services.0.service_id'])}</div>}
            </div>
            <Button type="button" onClick={addService} className="shrink-0">Ajouter</Button>
          </div>

          <div className="overflow-hidden rounded-md border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="h-9 py-2">Service</TableHead>
                  <TableHead className="h-9 w-[120px] py-2 text-right">Prix</TableHead>
                  <TableHead className="h-9 w-[80px] py-2"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {serviceLines.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} className="py-3 text-center text-sm text-muted-foreground">Aucun service ajouté</TableCell>
                  </TableRow>
                )}
                {serviceLines.map((line, idx) => {
                  const s = findService(line.service_id)
                  const unit = s?.price ?? 0
                  return (
                    <TableRow key={`srv-${idx}`}>
                      <TableCell className="py-2">{s?.name}</TableCell>
                      <TableCell className="py-2 text-right">{new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF' }).format(unit)}</TableCell>
                      <TableCell className="py-2 text-right">
                        <Button type="button" variant="ghost" size="sm" className="h-7 px-2" onClick={() => removeService(idx)}>Retirer</Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>

          <div className="flex items-center justify-end gap-3 text-sm">
            <div className="text-muted-foreground">Total services:</div>
            <div className="font-medium">{new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF' }).format(servicesSubtotal)}</div>
          </div>
        </div>
      </div>

      {/* Produits ensuite */}
      <div className="rounded-md border">
        <div className="border-b px-3 py-2">
          <h3 className="text-sm font-medium">Produits</h3>
        </div>
        <div className="space-y-3 p-3">
          <div className="flex flex-wrap items-end gap-2">
            <div className="min-w-[220px] grow">
              <Select value={selectedProductId} onValueChange={(v) => setSelectedProductId(v)}>
                <SelectTrigger aria-label="Produit">
                  <SelectValue placeholder="Sélectionner un produit" />
                </SelectTrigger>
                <SelectContent>
                  {productOptions.map((p) => (
                    <SelectItem key={p.id} value={String(p.id)}>{p.name} — {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF' }).format(p.price)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors['products.0.product_id'] && <div className="mt-1 text-xs text-destructive">{String(errors['products.0.product_id'])}</div>}
            </div>
            <div className="w-[120px]">
              <Input type="number" min={1} value={String(productQty)} onChange={(e) => setProductQty(Number(e.target.value) || 1)} placeholder="Qté" aria-label="Quantité" />
            </div>
            <Button type="button" onClick={addProduct} className="shrink-0">Ajouter</Button>
          </div>

          <div className="overflow-hidden rounded-md border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="h-9 py-2">Produit</TableHead>
                  <TableHead className="h-9 w-[90px] py-2 text-right">Qté</TableHead>
                  <TableHead className="h-9 w-[120px] py-2 text-right">Sous-total</TableHead>
                  <TableHead className="h-9 w-[80px] py-2"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {productLines.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="py-3 text-center text-sm text-muted-foreground">Aucun produit ajouté</TableCell>
                  </TableRow>
                )}
                {productLines.map((line, idx) => {
                  const p = findProduct(line.product_id)
                  const unit = p?.price ?? 0
                  const subtotal = unit * (line.quantity || 1)
                  return (
                    <TableRow key={`prod-${idx}`}>
                      <TableCell className="py-2">{p?.name}</TableCell>
                      <TableCell className="py-2 text-right">{line.quantity}</TableCell>
                      <TableCell className="py-2 text-right">{new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF' }).format(subtotal)}</TableCell>
                      <TableCell className="py-2 text-right">
                        <Button type="button" variant="ghost" size="sm" className="h-7 px-2" onClick={() => removeProduct(idx)}>Retirer</Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>

          <div className="flex items-center justify-end gap-3 text-sm">
            <div className="text-muted-foreground">Total produits:</div>
            <div className="font-medium">{new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF' }).format(productsSubtotal)}</div>
          </div>
        </div>
      </div>


      {/* Section dédiée Coiffeur sous Produits */}
      <div className="rounded-md border">
        <div className="border-b px-3 py-2">
          <h3 className="text-sm font-medium">Coiffeur</h3>
        </div>
        <div className="p-3 md:max-w-sm">
          <Select value={hairdresserId} onValueChange={setHairdresserId}>
            <SelectTrigger aria-label="Coiffeur">
              <SelectValue placeholder="Sélectionner un coiffeur" />
            </SelectTrigger>
            <SelectContent>
              {hairdressers.map((h) => (
                <SelectItem key={h.id} value={String(h.id)}>{h.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.hairdresser_id && <div className="mt-1 text-xs text-destructive">{String(errors.hairdresser_id)}</div>}
        </div>
      </div>

      <div className="rounded-md border">
        <div className="border-b px-3 py-2">
          <h3 className="text-sm font-medium">Promotion</h3>
        </div>
        <div className="space-y-3 p-3">
          <div className="flex items-center gap-3">
            <Button type="button" variant={addPromotion ? 'default' : 'outline'} onClick={() => setAddPromotion(v => !v)}>
              {addPromotion ? 'Retirer la promotion' : 'Ajouter une promotion'}
            </Button>
            {addPromotion && (
              <div className="min-w-[240px]">
                <Select value={selectedPromotionId} onValueChange={setSelectedPromotionId}>
                  <SelectTrigger aria-label="Promotion">
                    <SelectValue placeholder="Sélectionner une promotion" />
                  </SelectTrigger>
                  <SelectContent>
                    {promoOptions.map((pr) => (
                      <SelectItem key={pr.id} value={String(pr.id)}>
                        {pr.name} {pr.percentage ? `(${pr.percentage}%)` : pr.amount ? `(${new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF' }).format(pr.amount)})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
            <div className="flex items-center justify-between rounded-md border px-3 py-2">
                <span className="font-medium">{new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF' }).format(productsSubtotal)}</span>
            </div>
            <div className="flex items-center justify-between rounded-md border px-3 py-2"><span className="font-medium">{new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF' }).format(servicesSubtotal)}</span></div>
            <div className="flex items-center justify-between rounded-md border px-3 py-2"><span className="font-medium">− {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF' }).format(discount)}</span></div>
            <div className="flex items-center justify-between rounded-md border px-3 py-2"><span className="font-semibold">{new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF' }).format(grandTotal)}</span></div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">Lignes: <span className="text-foreground">{productLines.length + serviceLines.length}</span></div>
        <Button type="submit" disabled={productLines.length === 0 && serviceLines.length === 0}>{mode === 'create' ? 'Enregistrer la vente' : 'Mettre à jour la vente'}</Button>
      </div>
    </form>
  )
}
