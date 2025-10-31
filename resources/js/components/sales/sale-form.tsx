import { useEffect, useMemo, useState } from 'react'
import { router, usePage } from '@inertiajs/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { fr } from 'date-fns/locale'
import { format } from 'date-fns'
import { Calendar as CalendarIcon, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import salesRoutes from '@/routes/shops/sales/index'
import type { SalesPageProps, SaleRow } from '@/types/sale'

/* -------------------------------------------------------------------------- */
/*  Types internes                                                            */
/* -------------------------------------------------------------------------- */
type ProductLine = { product_id: number; quantity: number }
type ServiceLine = { service_id: number }

export type SaleFormProps = SalesPageProps & {
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
    onSuccess?: (sale: SaleRow) => void // utilisé uniquement en création
}

/* -------------------------------------------------------------------------- */
/*  Composant                                                                 */
/* -------------------------------------------------------------------------- */
export default function SaleForm({
                                     mode,
                                     initial,
                                     onDone,
                                     onSuccess,
                                     ...props
                                 }: SaleFormProps) {
    const {
        products: productOptions,
        services: serviceOptions,
        promotions: promoOptions,
        hairdressers,
        shop,
    } = props

    const { errors = {} } = (usePage().props as unknown as { errors?: Record<string, string> }) || {}

    /* --------------  États locaux  ----------------------------------------- */
    const [customerName, setCustomerName] = useState(initial?.customer_name ?? '')
    const [customerPhone, setCustomerPhone] = useState(initial?.customer_phone ?? '')
    const [saleDate, setSaleDate] = useState(initial?.sale_date ?? new Date().toISOString().slice(0, 10))
    const [hairdresserId, setHairdresserId] = useState<string>(
        initial?.hairdresser_id ? String(initial.hairdresser_id) : ''
    )

    const [selectedProductId, setSelectedProductId] = useState('')
    const [productQty, setProductQty] = useState(1)
    const [productLines, setProductLines] = useState<ProductLine[]>(initial?.products ?? [])

    const [selectedServiceId, setSelectedServiceId] = useState('')
    const [serviceLines, setServiceLines] = useState<ServiceLine[]>(initial?.services ?? [])

    const [addPromotion, setAddPromotion] = useState(Boolean(initial?.promotion_id))
    const [selectedPromotionId, setSelectedPromotionId] = useState<string>(
        initial?.promotion_id ? String(initial.promotion_id) : ''
    )

    /* --------------  Réinitialisation si `initial` change  ----------------- */
    useEffect(() => {
        if (!initial) return
        setCustomerName(initial.customer_name ?? '')
        setCustomerPhone(initial.customer_phone ?? '')
        setSaleDate(initial.sale_date ?? new Date().toISOString().slice(0, 10))
        setProductLines(initial.products ?? [])
        setServiceLines(initial.services ?? [])
        setAddPromotion(Boolean(initial.promotion_id))
        setSelectedPromotionId(initial.promotion_id ? String(initial.promotion_id) : '')
        setHairdresserId(initial.hairdresser_id ? String(initial.hairdresser_id) : '')
    }, [initial?.id])

    /* --------------  Utilitaires  ------------------------------------------ */
    const findProduct = (id?: number) => productOptions.find((p) => p.id === id)
    const findService = (id?: number) => serviceOptions.find((s) => s.id === id)
    const findPromotion = (id?: number) => promoOptions.find((p) => p.id === id)

    const productsSubtotal = useMemo(() => {
        return productLines.reduce((sum, line) => {
            const p = findProduct(line.product_id)
            return sum + (p?.price ?? 0) * line.quantity
        }, 0)
    }, [productLines, productOptions])

    const servicesSubtotal = useMemo(() => {
        return serviceLines.reduce((sum, line) => {
            const s = findService(line.service_id)
            return sum + (s?.price ?? 0)
        }, 0)
    }, [serviceLines, serviceOptions])

    const grossTotal = Math.round((productsSubtotal + servicesSubtotal) * 100) / 100

    const discount = useMemo(() => {
        if (!addPromotion || !selectedPromotionId) return 0
        const promo = findPromotion(Number(selectedPromotionId))
        if (!promo?.active) return 0

        let eligible = 0
        if (promo.applicable_to_products) eligible += productsSubtotal
        if (promo.applicable_to_services) eligible += servicesSubtotal
        if (eligible <= 0) return 0

        const pct = promo.percentage ?? 0
        const amt = promo.amount ?? 0

        let d = 0
        if (pct > 0) d = (pct / 100) * eligible
        else if (amt > 0) d = Math.min(amt, eligible)
        return Math.round(d * 100) / 100
    }, [addPromotion, selectedPromotionId, productsSubtotal, servicesSubtotal, promoOptions])

    const grandTotal = Math.round(Math.max(0, grossTotal - discount) * 100) / 100

    /* --------------  Handlers  --------------------------------------------- */
    const addProduct = () => {
        const id = Number(selectedProductId)
        if (!id || !findProduct(id)) return
        const qty = Math.max(1, productQty)
        setProductLines((prev) => [...prev, { product_id: id, quantity: qty }])
        setSelectedProductId('')
        setProductQty(1)
    }

    const removeProduct = (idx: number) => {
        setProductLines((prev) => prev.filter((_, i) => i !== idx))
    }

    const addService = () => {
        const id = Number(selectedServiceId)
        if (!id || !findService(id)) return
        setServiceLines((prev) => [...prev, { service_id: id }])
        setSelectedServiceId('')
    }

    const removeService = (idx: number) => {
        setServiceLines((prev) => prev.filter((_, i) => i !== idx))
    }

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        const shopId = typeof shop.id === 'object' ? (shop.id as any).id : shop.id

        const payload = {
            customer_name: customerName,
            customer_phone: customerPhone,
            sale_date: saleDate,
            hairdresser_id: hairdresserId ? Number(hairdresserId) : null,
            products: productLines,
            services: serviceLines,
            ...(addPromotion && selectedPromotionId ? { promotion_id: Number(selectedPromotionId) } : {}),
        }

        if (mode === 'create') {
            router.post(salesRoutes.index.url({ shop: shopId }), payload, {
                onSuccess: (page: any) => {
                    toast.success('Vente créée avec succès.')

                    /* ----  Construction de la SaleRow fraîche  ---- */
                    const fresh: SaleRow = {
                        id: page.props.sales?.data?.[0]?.id ?? Date.now(),
                        receipt_number: page.props.sales?.data?.[0]?.receipt_number ?? undefined,
                        customer_name: customerName || undefined,
                        customer_phone: customerPhone || undefined,
                        sale_date: saleDate,
                        hairdresser_name: hairdressers.find((h) => h.id === Number(hairdresserId))?.name ?? undefined,
                        total_amount: grandTotal,
                        promotion_applied: addPromotion && Boolean(selectedPromotionId),
                        promotion_label:
                            addPromotion && selectedPromotionId
                                ? promoOptions.find((p) => p.id === Number(selectedPromotionId))?.name ?? undefined
                                : undefined,
                        details: [
                            ...productLines.map((l) => {
                                const p = findProduct(l.product_id)!
                                return {
                                    type: 'product' as const,
                                    name: p.name,
                                    quantity: l.quantity,
                                    price: p.price,
                                    line_subtotal: p.price * l.quantity,
                                }
                            }),
                            ...serviceLines.map((l) => {
                                const s = findService(l.service_id)!
                                return {
                                    type: 'service' as const,
                                    name: s.name,
                                    price: s.price,
                                    line_subtotal: s.price,
                                }
                            }),
                        ],
                    }

                    onSuccess?.(fresh) // déclenche l’ouverture du ticket

                    /* reset formulaire */
                    setCustomerName('')
                    setCustomerPhone('')
                    setSaleDate(new Date().toISOString().slice(0, 10))
                    setProductLines([])
                    setServiceLines([])
                    setAddPromotion(false)
                    setSelectedPromotionId('')
                    setHairdresserId('')
                    router.reload({ only: ['sales'] })
                },
                onError: (errs) => Object.values(errs).forEach((m) => m && toast.error(String(m))),
            })
        } else {
            router.patch(
                salesRoutes.update.url({ shop: shopId, sale: initial!.id as any }),
                {
                    ...payload,
                    promotion_id: addPromotion && selectedPromotionId ? Number(selectedPromotionId) : null,
                },
                {
                    onSuccess: () => {
                        toast.success('Vente mise à jour avec succès.')
                        onDone?.()
                        router.reload({ only: ['sales'] })
                    },
                    onError: (errs) => Object.values(errs).forEach((m) => m && toast.error(String(m))),
                }
            )
        }
    }

    /* ------------------------------------------------------------------ */
    /*  Rendu                                                             */
    /* ------------------------------------------------------------------ */
    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            {/* === Infos client === */}
            <Card>
                <CardHeader className="py-2">
                    <CardTitle className="text-sm">Infos client</CardTitle>
                </CardHeader>
                <CardContent className="pb-6">
                    <div className="grid gap-4 md:grid-cols-2">
                        <div className="grid gap-1.5">
                            <Label htmlFor="customer_name">Nom du client</Label>
                            <Input
                                id="customer_name"
                                value={customerName}
                                onChange={(e) => setCustomerName(e.target.value)}
                                placeholder="Nom du client"
                                aria-label="Nom du client"
                            />
                            {errors.customer_name && <div className="text-xs text-destructive">{String(errors.customer_name)}</div>}
                        </div>
                        <div className="grid gap-1.5">
                            <Label htmlFor="customer_phone">Téléphone</Label>
                            <Input
                                id="customer_phone"
                                value={customerPhone}
                                onChange={(e) => setCustomerPhone(e.target.value)}
                                placeholder="Téléphone"
                                aria-label="Téléphone"
                            />
                            {errors.customer_phone && <div className="text-xs text-destructive">{String(errors.customer_phone)}</div>}
                        </div>
                        <div className="grid gap-1.5">
                            <Label htmlFor="sale_date">Date de vente</Label>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button id="sale_date" type="button" variant="outline" className="w-full justify-start">
                                        <CalendarIcon className="mr-2 h-4 w-4 opacity-50" />
                                        <span className={saleDate ? '' : 'text-muted-foreground'}>
                                            {saleDate ? format(new Date(saleDate + 'T00:00:00'), 'dd/MM/yyyy') : 'Sélectionner une date'}
                                        </span>
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent align="start" className="w-auto p-0">
                                    <Calendar
                                        mode="single"
                                        locale={fr}
                                        weekStartsOn={1 as any}
                                        selected={saleDate ? new Date(saleDate + 'T00:00:00') : undefined}
                                        onSelect={(d) => d && setSaleDate(d.toISOString().slice(0, 10))}
                                    />
                                </PopoverContent>
                            </Popover>
                            {errors.sale_date && <div className="text-xs text-destructive">{String(errors.sale_date)}</div>}
                        </div>
                        <div className="grid gap-1.5">
                            <Label htmlFor="hairdresser">Coiffeur</Label>
                            <Select value={hairdresserId} onValueChange={setHairdresserId}>
                                <SelectTrigger id="hairdresser" aria-label="Coiffeur">
                                    <SelectValue placeholder="Sélectionner un coiffeur" />
                                </SelectTrigger>
                                <SelectContent>
                                    {hairdressers.map((h) => (
                                        <SelectItem key={h.id} value={String(h.id)}>
                                            {h.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {errors.hairdresser_id && <div className="text-xs text-destructive">{String(errors.hairdresser_id)}</div>}
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* === Produits === */}
            <Card>
                <CardHeader className="py-2">
                    <CardTitle className="text-sm">Produits</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 pb-6">
                    <div className="flex flex-wrap items-end gap-2">
                        <div className="min-w-[220px] grow">
                            <Select value={selectedProductId} onValueChange={setSelectedProductId}>
                                <SelectTrigger aria-label="Produit">
                                    <SelectValue placeholder="Sélectionner un produit" />
                                </SelectTrigger>
                                <SelectContent>
                                    {productOptions.map((p) => (
                                        <SelectItem key={p.id} value={String(p.id)}>
                                            {p.name} — {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF' }).format(p.price)}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {errors['products.0.product_id'] && (
                                <div className="mt-1 text-xs text-destructive">{String(errors['products.0.product_id'])}</div>
                            )}
                        </div>
                        <div className="w-[120px]">
                            <Input
                                type="number"
                                min={1}
                                value={String(productQty)}
                                onChange={(e) => setProductQty(Number(e.target.value) || 1)}
                                placeholder="Qté"
                                aria-label="Quantité"
                            />
                        </div>
                        <Button type="button" onClick={addProduct} className="shrink-0">
                            <Plus className="h-4 w-4 mr-2" />
                            Ajouter
                        </Button>
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
                                        <TableCell colSpan={4} className="py-3 text-center text-sm text-muted-foreground">
                                            Aucun produit ajouté
                                        </TableCell>
                                    </TableRow>
                                )}
                                {productLines.map((line, idx) => {
                                    const p = findProduct(line.product_id)!
                                    const subtotal = p.price * line.quantity
                                    return (
                                        <TableRow key={`prod-${idx}`}>
                                            <TableCell className="py-2">{p.name}</TableCell>
                                            <TableCell className="py-2 text-right">{line.quantity}</TableCell>
                                            <TableCell className="py-2 text-right">
                                                {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF' }).format(subtotal)}
                                            </TableCell>
                                            <TableCell className="py-2 text-right">
                                                <Button type="button" variant="ghost" size="sm" className="h-7 px-2" onClick={() => removeProduct(idx)}>
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    )
                                })}
                            </TableBody>
                        </Table>
                    </div>

                    <div className="flex items-center justify-end gap-3 text-sm">
                        <div className="text-muted-foreground">Total produits :</div>
                        <div className="font-medium">
                            {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF' }).format(productsSubtotal)}
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* === Services === */}
            <Card>
                <CardHeader className="py-2">
                    <CardTitle className="text-sm">Services</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 pb-6">
                    <div className="flex flex-wrap items-end gap-2">
                        <div className="min-w-[220px] grow">
                            <Select value={selectedServiceId} onValueChange={setSelectedServiceId}>
                                <SelectTrigger aria-label="Service">
                                    <SelectValue placeholder="Sélectionner un service" />
                                </SelectTrigger>
                                <SelectContent>
                                    {serviceOptions.map((s) => (
                                        <SelectItem key={s.id} value={String(s.id)}>
                                            {s.name} — {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF' }).format(s.price)}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {errors['services.0.service_id'] && (
                                <div className="mt-1 text-xs text-destructive">{String(errors['services.0.service_id'])}</div>
                            )}
                        </div>
                        <Button type="button" onClick={addService} className="shrink-0">
                            <Plus className="h-4 w-4 mr-2" />
                            Ajouter
                        </Button>
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
                                        <TableCell colSpan={3} className="py-3 text-center text-sm text-muted-foreground">
                                            Aucun service ajouté
                                        </TableCell>
                                    </TableRow>
                                )}
                                {serviceLines.map((line, idx) => {
                                    const s = findService(line.service_id)!
                                    return (
                                        <TableRow key={`srv-${idx}`}>
                                            <TableCell className="py-2">{s.name}</TableCell>
                                            <TableCell className="py-2 text-right">
                                                {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF' }).format(s.price)}
                                            </TableCell>
                                            <TableCell className="py-2 text-right">
                                                <Button type="button" variant="ghost" size="sm" className="h-7 px-2" onClick={() => removeService(idx)}>
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    )
                                })}
                            </TableBody>
                        </Table>
                    </div>

                    <div className="flex items-center justify-end gap-3 text-sm">
                        <div className="text-muted-foreground">Total services :</div>
                        <div className="font-medium">
                            {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF' }).format(servicesSubtotal)}
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* === Promotion === */}
            <Card>
                <CardHeader className="py-2">
                    <CardTitle className="text-sm">Promotion</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 pb-6">
                    <div className="flex items-center gap-3">
                        <Button
                            type="button"
                            variant={addPromotion ? 'default' : 'outline'}
                            onClick={() => setAddPromotion((v) => !v)}
                        >
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
                                                {pr.name}{' '}
                                                {pr.percentage
                                                    ? `(${pr.percentage}%)`
                                                    : pr.amount
                                                        ? `(${new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF' }).format(pr.amount)})`
                                                        : ''}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
                        <div className="flex items-center justify-between rounded-md border px-3 py-2">
                            <span className="font-medium">
                                {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF' }).format(productsSubtotal)}
                            </span>
                        </div>
                        <div className="flex items-center justify-between rounded-md border px-3 py-2">
                            <span className="font-medium">
                                {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF' }).format(servicesSubtotal)}
                            </span>
                        </div>
                        <div className="flex items-center justify-between rounded-md border px-3 py-2">
                            <span className="font-medium">− {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF' }).format(discount)}</span>
                        </div>
                        <div className="flex items-center justify-between rounded-md border px-3 py-2">
                            <span className="font-semibold">
                                {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF' }).format(grandTotal)}
                            </span>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* === Ligne de bouton === */}
            <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                    Lignes : <span className="text-foreground">{productLines.length + serviceLines.length}</span>
                </div>
                <Button type="submit" disabled={productLines.length === 0 && serviceLines.length === 0}>
                    {mode === 'create' ? 'Enregistrer la vente' : 'Mettre à jour la vente'}
                </Button>
            </div>
        </form>
    )
}
