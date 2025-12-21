import { useEffect, useRef, useState } from 'react'
import { router, usePage } from '@inertiajs/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
// Popover pour dropdown suggestions
import { Popover, PopoverContent, PopoverTrigger, PopoverAnchor } from '@/components/ui/popover'
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
type ServiceLine = { service_id: number; quantity: number }

export type SaleFormProps = SalesPageProps & {
    mode: 'create' | 'edit'
    initial?: {
        id?: number | string
        customer_name?: string
        customer_phone?: string
        sale_date?: string // YYYY-MM-DD
        hairdresser_id?: number | null
        payment_method?: 'orange_money' | 'caisse'
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
    } = props

    const { errors = {} } = (usePage().props as unknown as { errors?: Record<string, string> }) || {}

    /* --------------  États locaux  ----------------------------------------- */
    const [customerName, setCustomerName] = useState(initial?.customer_name ?? '')
    const [customerPhone, setCustomerPhone] = useState(initial?.customer_phone ?? '')
    const [saleDate, setSaleDate] = useState(initial?.sale_date ?? new Date().toISOString())
    const [hairdresserId, setHairdresserId] = useState<string>(
        initial?.hairdresser_id ? String(initial.hairdresser_id) : ''
    )

    type PaymentMethod = '' | 'orange_money' | 'caisse'
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(
        mode === 'create' ? '' : (initial?.payment_method ?? 'caisse')
    )

    const [selectedProductId, setSelectedProductId] = useState('')
    const [productQty, setProductQty] = useState(1)
    const [productLines, setProductLines] = useState<ProductLine[]>(initial?.products ?? [])

    const [selectedServiceId, setSelectedServiceId] = useState('')
    const [serviceQty, setServiceQty] = useState(1)
    const [serviceLines, setServiceLines] = useState<ServiceLine[]>(initial?.services ?? [])

    const [addPromotion, setAddPromotion] = useState(Boolean(initial?.promotion_id))
    const [selectedPromotionId, setSelectedPromotionId] = useState<string>(
        initial?.promotion_id ? String(initial.promotion_id) : ''
    )

    /* --------------  Autocomplete client (nom & téléphone) ----------------- */
    type ClientSuggestion = { name: string; phone: string }
    const [suggestions, setSuggestions] = useState<ClientSuggestion[]>([])
    const [openName, setOpenName] = useState(false)
    const [openPhone, setOpenPhone] = useState(false)
    const debounceRef = useRef<number | null>(null)

    const shopId = props.shop.id

    function fetchSuggestions(q: string) {
        if (!q || q.trim().length < 1) {
            setSuggestions([])
            return
        }
        // Construire l'URL de façon déterministe (sans helper) pour éviter tout souci de bundler/HMR
        const url = `/shops/${shopId}/sales/client-suggestions?q=${encodeURIComponent(q)}&limit=8`
        fetch(url, { headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' } })
            .then((r) => (r.ok ? r.json() : []))
            .then((data: ClientSuggestion[]) => setSuggestions(Array.isArray(data) ? data : []))
            .catch(() => setSuggestions([]))
    }

    const onChangeName = (v: string) => {
        setCustomerName(v)
        setOpenName(true)
        // Trigger an immediate fetch to ensure at least one request is sent
        if (v.trim().length >= 1) {
            fetchSuggestions(v)
        }
        if (debounceRef.current) window.clearTimeout(debounceRef.current)
        debounceRef.current = window.setTimeout(() => fetchSuggestions(v), 180)
    }

    const onChangePhone = (v: string) => {
        setCustomerPhone(v)
        setOpenPhone(true)
        if (v.trim().length >= 1) {
            fetchSuggestions(v)
        }
        if (debounceRef.current) window.clearTimeout(debounceRef.current)
        debounceRef.current = window.setTimeout(() => fetchSuggestions(v), 180)
    }

    function chooseSuggestion(s: ClientSuggestion) {
        setCustomerName(s.name || '')
        setCustomerPhone(s.phone || '')
        setOpenName(false)
        setOpenPhone(false)
    }

    /* --------------  Réinitialisation si `initial` change  ----------------- */
    useEffect(() => {
        if (!initial) return
        // Defer batched state updates to avoid set-state-in-effect lint warning
        queueMicrotask(() => {
            setCustomerName(initial.customer_name ?? '')
            setCustomerPhone(initial.customer_phone ?? '')
            setSaleDate(initial.sale_date ?? new Date().toISOString().slice(0, 10))
            setProductLines(initial.products ?? [])
            setServiceLines(initial.services ?? [])
            setAddPromotion(Boolean(initial.promotion_id))
            setSelectedPromotionId(initial.promotion_id ? String(initial.promotion_id) : '')
            setHairdresserId(initial.hairdresser_id ? String(initial.hairdresser_id) : '')
            if (mode === 'edit') {
                setPaymentMethod((initial.payment_method ?? 'caisse') as Exclude<PaymentMethod, ''>)
            }
        })
    }, [initial?.id, mode])

    /* --------------  Utilitaires  ------------------------------------------ */
    const findProduct = (id?: number) => productOptions.find((p) => p.id === id)
    const findService = (id?: number) => serviceOptions.find((s) => s.id === id)
    const findPromotion = (id?: number) => promoOptions.find((p) => p.id === id)

    const productsSubtotal = productLines.reduce((sum, line) => {
        const p = findProduct(line.product_id)
        return sum + (p?.price ?? 0) * line.quantity
    }, 0)

    const servicesSubtotal = serviceLines.reduce((sum, line) => {
        const s = findService(line.service_id)
        return sum + (s?.price ?? 0) * line.quantity
    }, 0)

    const grossTotal = Math.round((productsSubtotal + servicesSubtotal) * 100) / 100

    const discount = (() => {
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
    })()

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
        const qty = Math.max(1, serviceQty)
        setServiceLines((prev) => [...prev, { service_id: id, quantity: qty }])
        setSelectedServiceId('')
        setServiceQty(1)
    }

    const removeService = (idx: number) => {
        setServiceLines((prev) => prev.filter((_, i) => i !== idx))
    }

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()

        // Champ requis côté client pour une meilleure UX (validation serveur également en place)
        if (!paymentMethod) {
            toast.error('Veuillez sélectionner un moyen de paiement.')
            return
        }

        const payload = {
            customer_name: customerName,
            customer_phone: customerPhone,
            sale_date: saleDate,
            hairdresser_id: hairdresserId ? Number(hairdresserId) : null,
            payment_method: paymentMethod,
            products: productLines,
            services: serviceLines,
            ...(addPromotion && selectedPromotionId ? { promotion_id: Number(selectedPromotionId) } : {}),
        }

        if (mode === 'create') {
            router.post(salesRoutes.index.url({ shop: shopId }), payload, {
                onSuccess: (page: { props: { sales?: { data?: Array<Partial<SaleRow>> } } }) => {
                    toast.success('Vente créée avec succès.')

                    /* ----  Construction de la SaleRow fraîche  ---- */
                    const fresh: SaleRow = {
                        id: (page.props.sales?.data?.[0]?.id as SaleRow['id']) ?? Date.now(),
                        receipt_number: (page.props.sales?.data?.[0]?.receipt_number as string | null | undefined) ?? undefined,
                        customer_name: customerName || undefined,
                        customer_phone: customerPhone || undefined,
                        sale_date: saleDate,
                        hairdresser_name: hairdressers.find((h) => h.id === Number(hairdresserId))?.name ?? undefined,
                        payment_method: paymentMethod || undefined,
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
                                    unit_price: p.price,
                                    line_subtotal: p.price * l.quantity,
                                }
                            }),
                            ...serviceLines.map((l) => {
                                const s = findService(l.service_id)!
                                return {
                                    type: 'service' as const,
                                    name: s.name,
                                    price: s.price,
                                    quantity: l.quantity,
                                    line_subtotal: s.price * l.quantity,
                                }
                            }),
                        ],
                    }

                    onSuccess?.(fresh) // déclenche l’ouverture du ticket

                    /* reset formulaire */
                    setCustomerName('')
                    setCustomerPhone('')
                    setSaleDate(new Date().toISOString())
                    setProductLines([])
                    setServiceLines([])
                    setAddPromotion(false)
                    setSelectedPromotionId('')
                    setHairdresserId('')
                    setPaymentMethod('')
                    router.reload({ only: ['sales'] })
                },
                onError: (errs) => Object.values(errs).forEach((m) => m && toast.error(String(m))),
            })
        } else {
            router.patch(
                salesRoutes.update.url({ shop: shopId, sale: initial!.id as SaleRow['id'] }),
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
                            <Popover open={openName} onOpenChange={setOpenName}>
                                {/* Use an explicit anchor to avoid relying on Trigger cloning */}
                                <PopoverAnchor asChild>
                                    <Input
                                        id="customer_name"
                                        value={customerName}
                                        onChange={(e) => onChangeName(e.target.value)}
                                        onFocus={() => {
                                            if (customerName) {
                                                setOpenName(true)
                                                fetchSuggestions(customerName)
                                            } else {
                                                // Ouvre le popover dès la frappe du premier caractère
                                                setOpenName(true)
                                            }
                                        }}
                                        placeholder="Nom du client"
                                        aria-label="Nom du client"
                                        autoComplete="off"
                                        onInput={(e) => {
                                            const v = (e.target as HTMLInputElement).value
                                            if (v.trim().length >= 1) {
                                                setOpenName(true)
                                                fetchSuggestions(v)
                                            }
                                        }}
                                    />
                                </PopoverAnchor>
                                {/* Force width to match anchor; provide a safe fallback so content is visible even if var is undefined */}
                                <PopoverContent
                                    align="start"
                                    className="p-0"
                                    style={{ width: 'var(--radix-popper-anchor-width, 16rem)' }}
                                >
                                    {suggestions.length === 0 ? (
                                        <div className="p-2 text-sm text-muted-foreground">Aucune suggestion</div>
                                    ) : (
                                        <ul className="max-h-56 overflow-auto divide-y">
                                            {suggestions.map((s, i) => (
                                                <li
                                                    key={`${s.name}-${s.phone}-${i}`}
                                                    className="px-3 py-2 hover:bg-muted cursor-pointer text-sm"
                                                    onMouseDown={(e) => e.preventDefault()}
                                                    onClick={() => chooseSuggestion(s)}
                                                >
                                                    <div className="font-medium text-foreground">{s.name || '—'}</div>
                                                    {s.phone && <div className="text-xs text-muted-foreground">{s.phone}</div>}
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </PopoverContent>
                            </Popover>
                            {errors.customer_name && <div className="text-xs text-destructive">{String(errors.customer_name)}</div>}
                        </div>
                        <div className="grid gap-1.5">
                            <Label htmlFor="customer_phone">Téléphone</Label>
                            <Popover open={openPhone} onOpenChange={setOpenPhone}>
                                {/* Use an explicit anchor to avoid relying on Trigger cloning */}
                                <PopoverAnchor asChild>
                                    <Input
                                        id="customer_phone"
                                        value={customerPhone}
                                        onChange={(e) => onChangePhone(e.target.value)}
                                        onFocus={() => {
                                            if (customerPhone) {
                                                setOpenPhone(true)
                                                fetchSuggestions(customerPhone)
                                            } else {
                                                setOpenPhone(true)
                                            }
                                        }}
                                        placeholder="Téléphone"
                                        aria-label="Téléphone"
                                        autoComplete="off"
                                        inputMode="tel"
                                        onInput={(e) => {
                                            const v = (e.target as HTMLInputElement).value
                                            if (v.trim().length >= 1) {
                                                setOpenPhone(true)
                                                fetchSuggestions(v)
                                            }
                                        }}
                                    />
                                </PopoverAnchor>
                                {/* Force width to match anchor; provide a safe fallback so content is visible even if var is undefined */}
                                <PopoverContent
                                    align="start"
                                    className="p-0"
                                    style={{ width: 'var(--radix-popper-anchor-width, 16rem)' }}
                                >
                                    {suggestions.length === 0 ? (
                                        <div className="p-2 text-sm text-muted-foreground">Aucune suggestion</div>
                                    ) : (
                                        <ul className="max-h-56 overflow-auto divide-y">
                                            {suggestions.map((s, i) => (
                                                <li
                                                    key={`${s.name}-${s.phone}-${i}`}
                                                    className="px-3 py-2 hover:bg-muted cursor-pointer text-sm"
                                                    onMouseDown={(e) => e.preventDefault()}
                                                    onClick={() => chooseSuggestion(s)}
                                                >
                                                    <div className="font-medium text-foreground">{s.phone || '—'}</div>
                                                    {s.name && <div className="text-xs text-muted-foreground">{s.name}</div>}
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </PopoverContent>
                            </Popover>
                            {errors.customer_phone && <div className="text-xs text-destructive">{String(errors.customer_phone)}</div>}
                        </div>
                        <div className="grid gap-1.5">
                            <Label htmlFor="sale_date">Date de vente</Label>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button id="sale_date" type="button" variant="outline" className="w-full justify-start">
                                        <CalendarIcon className="mr-2 h-4 w-4 opacity-50" />
                                        <span className={saleDate ? '' : 'text-muted-foreground'}>
                                            {saleDate ? format(new Date(saleDate), 'dd-MM-yyyy HH:mm') : 'Sélectionner une date'}
                                        </span>
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent align="start" className="w-auto p-0">
                                    <div className="p-3 border-b">
                                        <Input
                                            type="datetime-local"
                                            value={saleDate.slice(0, 16)}
                                            onChange={(e) => {
                                                const val = e.target.value
                                                if (val) {
                                                    setSaleDate(new Date(val).toISOString())
                                                }
                                            }}
                                        />
                                    </div>
                                    <Calendar
                                        mode="single"
                                        locale={fr}
                                        weekStartsOn={1}
                                        selected={saleDate ? new Date(saleDate) : undefined}
                                        onSelect={(d) => {
                                            if (d) {
                                                const current = new Date(saleDate)
                                                d.setHours(current.getHours())
                                                d.setMinutes(current.getMinutes())
                                                setSaleDate(d.toISOString())
                                            }
                                        }}
                                    />
                                </PopoverContent>
                            </Popover>
                            {errors.sale_date && <div className="text-xs text-destructive">{String(errors.sale_date)}</div>}
                        </div>
                        {/* Le choix du coiffeur est déplacé dans une section dédiée sous Produits */}
                        {/* Moyen de paiement */}
                        <div className="grid gap-1.5">
                            <Label htmlFor="payment_method">Moyen de paiement</Label>
                            <Select value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as 'orange_money' | 'caisse' | '')}>
                                <SelectTrigger id="payment_method" aria-label="Moyen de paiement">
                                    <SelectValue placeholder="Sélectionner un moyen de paiement" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="caisse">Caisse</SelectItem>
                                    <SelectItem value="orange_money">Orange Money</SelectItem>
                                </SelectContent>
                            </Select>
                            {errors.payment_method && (
                                <div className="text-xs text-destructive">{String(errors.payment_method)}</div>
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* === Services (doit apparaître avant Produits) === */}
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
                        <div className="w-20">
                            <Input
                                type="number"
                                min={1}
                                value={serviceQty}
                                onChange={(e) => setServiceQty(Number(e.target.value))}
                                placeholder="Qté"
                                className="h-9"
                                aria-label="Quantité service"
                            />
                        </div>
                        <Button type="button" onClick={addService} className="shrink-0 h-9">
                            <Plus className="h-4 w-4 mr-2" />
                            Ajouter
                        </Button>
                    </div>

                    <div className="overflow-hidden rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-muted/50">
                                    <TableHead className="h-9 py-2">Service</TableHead>
                                    <TableHead className="h-9 w-[100px] py-2 text-center">Qté</TableHead>
                                    <TableHead className="h-9 w-[120px] py-2 text-right">Total</TableHead>
                                    <TableHead className="h-9 w-[80px] py-2"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {serviceLines.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={4} className="py-3 text-center text-sm text-muted-foreground">
                                            Aucun service ajouté
                                        </TableCell>
                                    </TableRow>
                                )}
                                {serviceLines.map((line, idx) => {
                                    const s = findService(line.service_id)!
                                    return (
                                        <TableRow key={`srv-${idx}`}>
                                            <TableCell className="py-2">{s.name}</TableCell>
                                            <TableCell className="py-2 text-center">{line.quantity}</TableCell>
                                            <TableCell className="py-2 text-right">
                                                {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF' }).format(s.price * line.quantity)}
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
                                    <TableHead className="h-9 py-2 w-[50px]"></TableHead>
                                    <TableHead className="h-9 py-2">Produit</TableHead>
                                    <TableHead className="h-9 w-[90px] py-2 text-right">Qté</TableHead>
                                    <TableHead className="h-9 w-[120px] py-2 text-right">Sous-total</TableHead>
                                    <TableHead className="h-9 w-[80px] py-2"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {productLines.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={5} className="py-3 text-center text-sm text-muted-foreground">
                                            Aucun produit ajouté
                                        </TableCell>
                                    </TableRow>
                                )}
                                {productLines.map((line, idx) => {
                                    const p = findProduct(line.product_id)!
                                    const subtotal = p.price * line.quantity
                                    return (
                                        <TableRow key={`prod-${idx}`}>
                                            <TableCell className="py-2">
                                                {p.image_url ? (
                                                    <img src={p.image_url} alt={p.name} className="h-8 w-8 rounded-md object-cover" />
                                                ) : (
                                                    <div className="h-8 w-8 rounded-md bg-muted flex items-center justify-center">
                                                        <span className="text-[10px] text-muted-foreground uppercase">{p.name.substring(0, 2)}</span>
                                                    </div>
                                                )}
                                            </TableCell>
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

            {/* === Coiffeur (section dédiée, sous Produits) === */}
            <Card>
                <CardHeader className="py-2">
                    <CardTitle className="text-sm">Coiffeur</CardTitle>
                </CardHeader>
                <CardContent className="pb-6">
                    <div className="grid gap-1.5 md:max-w-sm">
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
                    {mode === 'create' ? 'Enregistrer en caisse' : 'Mettre à jour la vente'}
                </Button>
            </div>
        </form>
    )
}
