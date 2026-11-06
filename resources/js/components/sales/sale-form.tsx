import { useEffect, useMemo, useRef, useState } from 'react'
import { router, usePage } from '@inertiajs/react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { Calendar as CalendarIcon, Minus, Plus, SearchIcon } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Popover, PopoverAnchor, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { formatCurrency as fmt } from '@/lib/thermal-ticket'
import { cn } from '@/lib/utils'
import salesRoutes from '@/routes/shops/sales/index'
import type { SaleRow, SalesPageProps } from '@/types/sale'

type ProductLine = { product_id: number; quantity: number }
type ServiceLine = { service_id: number; quantity: number }
type PaymentMethod = '' | 'orange_money' | 'caisse'
type ClientSuggestion = { name: string; phone: string }
type CatalogItem = { id: number; name: string; price: number }

const NO_PROMOTION = 'none'

export type SaleFormProps = Pick<SalesPageProps, 'products' | 'services' | 'promotions' | 'hairdressers'> & {
    shop: { id: number | string }
    mode: 'create' | 'edit'
    initial?: {
        id?: number | string
        customer_name?: string
        customer_phone?: string
        sale_date?: string
        hairdresser_id?: number | null
        payment_method?: 'orange_money' | 'caisse'
        promotion_id?: number | null
        products?: ProductLine[]
        services?: ServiceLine[]
    }
    onDone?: () => void
    onSuccess?: (sale: SaleRow) => void
}

export default function SaleForm({ mode, initial, onDone, onSuccess, ...props }: SaleFormProps) {
    const { products: productOptions, services: serviceOptions, promotions: promoOptions, hairdressers } = props
    const shopId = props.shop.id as number
    const { errors = {} } = (usePage().props as unknown as { errors?: Record<string, string> }) || {}

    const [customerName, setCustomerName] = useState(initial?.customer_name ?? '')
    const [customerPhone, setCustomerPhone] = useState(initial?.customer_phone ?? '')
    const [saleDate, setSaleDate] = useState(initial?.sale_date ?? new Date().toISOString())
    const [hairdresserId, setHairdresserId] = useState(initial?.hairdresser_id ? String(initial.hairdresser_id) : '')
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(mode === 'create' ? '' : (initial?.payment_method ?? 'caisse'))
    const [productLines, setProductLines] = useState<ProductLine[]>(initial?.products ?? [])
    const [serviceLines, setServiceLines] = useState<ServiceLine[]>(initial?.services ?? [])
    const [promotionId, setPromotionId] = useState(initial?.promotion_id ? String(initial.promotion_id) : NO_PROMOTION)
    const [search, setSearch] = useState('')
    const [isSubmitting, setIsSubmitting] = useState(false)

    const findProduct = (id: number) => productOptions.find((p) => p.id === id)
    const findService = (id: number) => serviceOptions.find((s) => s.id === id)

    const productsSubtotal = productLines.reduce((sum, l) => sum + (findProduct(l.product_id)?.price ?? 0) * l.quantity, 0)
    const servicesSubtotal = serviceLines.reduce((sum, l) => sum + (findService(l.service_id)?.price ?? 0) * l.quantity, 0)
    const grossTotal = Math.round((productsSubtotal + servicesSubtotal) * 100) / 100

    const promotion = promoOptions.find((p) => String(p.id) === promotionId)
    const discount = (() => {
        if (!promotion?.active) return 0
        const eligible = (promotion.applicable_to_products ? productsSubtotal : 0) + (promotion.applicable_to_services ? servicesSubtotal : 0)
        if (eligible <= 0) return 0
        const value = promotion.percentage > 0 ? (promotion.percentage / 100) * eligible : Math.min(promotion.amount ?? 0, eligible)
        return Math.round(value * 100) / 100
    })()
    const grandTotal = Math.round(Math.max(0, grossTotal - discount) * 100) / 100

    const changeProduct = (id: number, delta: number) => {
        setProductLines((lines) => applyDelta(lines, 'product_id', id, delta) as ProductLine[])
    }
    const changeService = (id: number, delta: number) => {
        setServiceLines((lines) => applyDelta(lines, 'service_id', id, delta) as ServiceLine[])
    }

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (isSubmitting) {
            return
        }
        if (!customerName.trim() || !customerPhone.trim()) {
            toast.error('Veuillez renseigner le nom et le téléphone du client.')
            return
        }
        if (!paymentMethod) {
            toast.error('Veuillez sélectionner un moyen de paiement.')
            return
        }

        setIsSubmitting(true)

        const payload = {
            customer_name: customerName,
            customer_phone: customerPhone,
            sale_date: saleDate,
            hairdresser_id: hairdresserId ? Number(hairdresserId) : null,
            payment_method: paymentMethod,
            products: productLines,
            services: serviceLines,
            promotion_id: promotion ? promotion.id : null,
        }
        const onError = (errs: Record<string, string>) => Object.values(errs).forEach((m) => m && toast.error(String(m)))
        const onFinish = () => setIsSubmitting(false)

        if (mode === 'create') {
            router.post(salesRoutes.index.url({ shop: shopId }), payload, {
                onSuccess: (page) => {
                    toast.success('Vente créée avec succès.')
                    const created = (page.flash as { created_sale?: SaleRow } | undefined)?.created_sale
                    if (created) {
                        onSuccess?.(created)
                    }
                },
                onError,
                onFinish,
            })
        } else {
            router.patch(salesRoutes.update.url({ shop: shopId, sale: initial!.id as number }), payload, {
                onSuccess: () => {
                    toast.success('Vente mise à jour avec succès.')
                    onDone?.()
                },
                onError,
                onFinish,
            })
        }
    }

    const hasLines = productLines.length + serviceLines.length > 0
    const query = search.trim().toLowerCase()
    const filterCatalog = (items: CatalogItem[]) => (query ? items.filter((i) => i.name.toLowerCase().includes(query)) : items)

    return (
        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
            <div className="grid min-h-0 flex-1 overflow-y-auto md:grid-cols-[minmax(0,1fr)_minmax(320px,380px)] md:overflow-hidden">
                {/* Catalogue : un toucher ajoute la prestation au panier */}
                <div className="space-y-4 p-4 md:overflow-y-auto">
                    <div className="relative">
                        <SearchIcon className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
                        <Input
                            type="search"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Rechercher un service ou un produit"
                            aria-label="Rechercher dans le catalogue"
                            className="pl-9"
                        />
                    </div>
                    <CatalogGrid
                        title="Services"
                        items={filterCatalog(serviceOptions)}
                        quantityOf={(id) => serviceLines.find((l) => l.service_id === id)?.quantity ?? 0}
                        onAdd={(id) => changeService(id, 1)}
                    />
                    <CatalogGrid
                        title="Produits"
                        items={filterCatalog(productOptions)}
                        quantityOf={(id) => productLines.find((l) => l.product_id === id)?.quantity ?? 0}
                        onAdd={(id) => changeProduct(id, 1)}
                    />
                </div>

                {/* Panier et informations de vente */}
                <div className="space-y-5 border-t bg-muted/40 p-4 md:overflow-y-auto md:border-t-0 md:border-l">
                    <section aria-label="Panier">
                        <h3 className="mb-2 text-sm font-semibold">Panier</h3>
                        {!hasLines ? (
                            <p className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">Touchez un service ou un produit pour l’ajouter.</p>
                        ) : (
                            <ul className="divide-y rounded-lg border bg-card">
                                {serviceLines.map((line) => {
                                    const item = findService(line.service_id)
                                    return item && <CartLine key={`s-${item.id}`} item={item} quantity={line.quantity} onChange={(d) => changeService(item.id, d)} />
                                })}
                                {productLines.map((line) => {
                                    const item = findProduct(line.product_id)
                                    return item && <CartLine key={`p-${item.id}`} item={item} quantity={line.quantity} onChange={(d) => changeProduct(item.id, d)} />
                                })}
                            </ul>
                        )}
                    </section>

                    <section className="space-y-3" aria-label="Client">
                        <ClientField
                            id="customer_name"
                            label="Nom du client"
                            field="name"
                            shopId={shopId}
                            value={customerName}
                            error={errors.customer_name}
                            onChange={setCustomerName}
                            onChoose={(s) => {
                                setCustomerName(s.name || '')
                                setCustomerPhone(s.phone || '')
                            }}
                        />
                        <ClientField
                            id="customer_phone"
                            label="Téléphone"
                            field="phone"
                            shopId={shopId}
                            value={customerPhone}
                            error={errors.customer_phone}
                            onChange={setCustomerPhone}
                            onChoose={(s) => {
                                setCustomerName(s.name || '')
                                setCustomerPhone(s.phone || '')
                            }}
                        />
                    </section>

                    <fieldset>
                        <legend className="mb-2 text-sm font-medium">Moyen de paiement</legend>
                        <div className="grid grid-cols-2 gap-2">
                            <Choice selected={paymentMethod === 'caisse'} onClick={() => setPaymentMethod('caisse')}>Caisse</Choice>
                            <Choice selected={paymentMethod === 'orange_money'} onClick={() => setPaymentMethod('orange_money')}>Orange Money</Choice>
                        </div>
                        {errors.payment_method && <div className="mt-1 text-xs text-destructive-foreground">{errors.payment_method}</div>}
                    </fieldset>

                    {hairdressers.length > 0 && (
                        <fieldset>
                            <legend className="mb-2 text-sm font-medium">Coiffeur</legend>
                            <div className="flex flex-wrap gap-2">
                                {hairdressers.map((h) => (
                                    <Choice key={h.id} selected={hairdresserId === String(h.id)} onClick={() => setHairdresserId((v) => (v === String(h.id) ? '' : String(h.id)))}>
                                        {h.name}
                                    </Choice>
                                ))}
                            </div>
                        </fieldset>
                    )}

                    {promoOptions.length > 0 && (
                        <div className="grid gap-1.5">
                            <Label htmlFor="promotion">Promotion</Label>
                            <Select value={promotionId} onValueChange={setPromotionId}>
                                <SelectTrigger id="promotion" className="w-full bg-card">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value={NO_PROMOTION}>Aucune promotion</SelectItem>
                                    {promoOptions.map((pr) => (
                                        <SelectItem key={pr.id} value={String(pr.id)}>
                                            {pr.name} {pr.percentage ? `(${pr.percentage}%)` : pr.amount ? `(${fmt(pr.amount)})` : ''}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}

                    <SaleDateField value={saleDate} onChange={setSaleDate} error={errors.sale_date} />
                </div>
            </div>

            {/* Total toujours visible, à portée de pouce */}
            <div className="flex shrink-0 items-center justify-between gap-4 border-t bg-card p-4">
                <div>
                    {discount > 0 && <div className="text-xs text-muted-foreground">Remise −{fmt(discount)}</div>}
                    <div className="text-xl font-semibold tabular-nums md:text-2xl">{fmt(grandTotal)}</div>
                </div>
                <Button type="submit" size="lg" className="px-6" disabled={isSubmitting || !hasLines}>
                    {isSubmitting ? 'Enregistrement…' : mode === 'create' ? 'Encaisser et imprimer' : 'Mettre à jour'}
                </Button>
            </div>
        </form>
    )
}

function applyDelta<K extends 'product_id' | 'service_id'>(lines: Array<Record<K, number> & { quantity: number }>, key: K, id: number, delta: number) {
    const exists = lines.some((l) => l[key] === id)
    if (!exists) {
        return delta > 0 ? [...lines, { [key]: id, quantity: delta } as Record<K, number> & { quantity: number }] : lines
    }
    return lines.map((l) => (l[key] === id ? { ...l, quantity: l.quantity + delta } : l)).filter((l) => l.quantity > 0)
}

function CatalogGrid({ title, items, quantityOf, onAdd }: { title: string; items: CatalogItem[]; quantityOf: (id: number) => number; onAdd: (id: number) => void }) {
    if (items.length === 0) {
        return null
    }
    return (
        <section aria-label={title}>
            <h3 className="mb-2 text-sm font-semibold">{title}</h3>
            <div className="grid grid-cols-2 gap-2 lg:grid-cols-3">
                {items.map((item) => {
                    const quantity = quantityOf(item.id)
                    return (
                        <button
                            key={item.id}
                            type="button"
                            onClick={() => onAdd(item.id)}
                            className={cn(
                                'relative flex min-h-18 flex-col justify-between gap-1 rounded-lg border bg-card p-3 text-left transition-colors active:bg-accent',
                                quantity > 0 && 'border-brand ring-1 ring-brand',
                            )}
                        >
                            <span className="line-clamp-2 pr-6 text-sm leading-snug font-medium">{item.name}</span>
                            <span className="text-sm text-muted-foreground tabular-nums">{fmt(item.price)}</span>
                            {quantity > 0 && (
                                <span className="absolute top-2 right-2 grid size-6 place-items-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                                    {quantity}
                                </span>
                            )}
                        </button>
                    )
                })}
            </div>
        </section>
    )
}

function CartLine({ item, quantity, onChange }: { item: CatalogItem; quantity: number; onChange: (delta: number) => void }) {
    return (
        <li className="flex items-center gap-2 p-2 pl-3">
            <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">{item.name}</div>
                <div className="text-xs text-muted-foreground tabular-nums">{fmt(item.price * quantity)}</div>
            </div>
            <Button type="button" variant="outline" size="icon" onClick={() => onChange(-1)} aria-label={`Retirer un ${item.name}`}>
                <Minus />
            </Button>
            <span className="w-6 text-center text-sm font-semibold tabular-nums">{quantity}</span>
            <Button type="button" variant="outline" size="icon" onClick={() => onChange(1)} aria-label={`Ajouter un ${item.name}`}>
                <Plus />
            </Button>
        </li>
    )
}

function Choice({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: React.ReactNode }) {
    return (
        <button
            type="button"
            aria-pressed={selected}
            onClick={onClick}
            className={cn(
                'min-h-11 rounded-lg border px-3 text-sm font-medium transition-colors',
                selected ? 'border-primary bg-primary text-primary-foreground' : 'bg-card active:bg-accent',
            )}
        >
            {children}
        </button>
    )
}

function ClientField({ id, label, field, shopId, value, error, onChange, onChoose }: {
    id: string
    label: string
    field: 'name' | 'phone'
    shopId: number
    value: string
    error?: string
    onChange: (value: string) => void
    onChoose: (suggestion: ClientSuggestion) => void
}) {
    const [suggestions, setSuggestions] = useState<ClientSuggestion[]>([])
    const [focused, setFocused] = useState(false)
    const debounce = useRef<number | null>(null)

    useEffect(() => () => {
        if (debounce.current) window.clearTimeout(debounce.current)
    }, [])

    const handleChange = (next: string) => {
        onChange(next)
        if (debounce.current) window.clearTimeout(debounce.current)
        if (!next.trim()) {
            setSuggestions([])
            return
        }
        debounce.current = window.setTimeout(() => {
            fetch(`/shops/${shopId}/sales/client-suggestions?q=${encodeURIComponent(next)}&limit=8`, {
                headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
            })
                .then((r) => (r.ok ? r.json() : []))
                .then((data: ClientSuggestion[]) => setSuggestions(Array.isArray(data) ? data : []))
                .catch(() => setSuggestions([]))
        }, 180)
    }

    return (
        <div className="grid gap-1.5">
            <Label htmlFor={id}>{label}</Label>
            <Popover open={focused && suggestions.length > 0}>
                <PopoverAnchor asChild>
                    <Input
                        id={id}
                        value={value}
                        onChange={(e) => handleChange(e.target.value)}
                        onFocus={() => setFocused(true)}
                        onBlur={() => setFocused(false)}
                        autoComplete="off"
                        inputMode={field === 'phone' ? 'tel' : 'text'}
                        className="bg-card"
                    />
                </PopoverAnchor>
                <PopoverContent align="start" className="p-0" style={{ width: 'var(--radix-popper-anchor-width, 16rem)' }} onOpenAutoFocus={(e) => e.preventDefault()}>
                    <ul className="max-h-56 divide-y overflow-auto">
                        {suggestions.map((s, i) => (
                            <li key={`${s.name}-${s.phone}-${i}`}>
                                <button
                                    type="button"
                                    className="w-full px-3 py-2.5 text-left text-sm hover:bg-muted"
                                    onMouseDown={(e) => e.preventDefault()}
                                    onClick={() => {
                                        onChoose(s)
                                        setSuggestions([])
                                    }}
                                >
                                    <div className="font-medium">{s[field] || '—'}</div>
                                    <div className="text-xs text-muted-foreground">{field === 'name' ? s.phone : s.name}</div>
                                </button>
                            </li>
                        ))}
                    </ul>
                </PopoverContent>
            </Popover>
            {error && <div className="text-xs text-destructive-foreground">{error}</div>}
        </div>
    )
}

function SaleDateField({ value, onChange, error }: { value: string; onChange: (value: string) => void; error?: string }) {
    const date = useMemo(() => new Date(value), [value])
    return (
        <div className="grid gap-1.5">
            <Label htmlFor="sale_date">Date de vente</Label>
            <Popover>
                <PopoverTrigger asChild>
                    <Button id="sale_date" type="button" variant="outline" className="w-full justify-start bg-card">
                        <CalendarIcon className="opacity-50" />
                        {format(date, 'dd/MM/yyyy HH:mm')}
                    </Button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-auto p-0">
                    <div className="border-b p-3">
                        <Input
                            type="time"
                            aria-label="Heure de la vente"
                            value={format(date, 'HH:mm')}
                            onChange={(e) => {
                                const [hours, minutes] = e.target.value.split(':').map(Number)
                                if (!Number.isNaN(hours)) {
                                    const next = new Date(date)
                                    next.setHours(hours, minutes)
                                    onChange(next.toISOString())
                                }
                            }}
                        />
                    </div>
                    <Calendar
                        mode="single"
                        locale={fr}
                        weekStartsOn={1}
                        selected={date}
                        onSelect={(d) => {
                            if (d) {
                                d.setHours(date.getHours(), date.getMinutes())
                                onChange(d.toISOString())
                            }
                        }}
                    />
                </PopoverContent>
            </Popover>
            {error && <div className="text-xs text-destructive-foreground">{error}</div>}
        </div>
    )
}
