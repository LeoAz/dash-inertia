import { useEffect, useMemo, useRef } from 'react'
import type { SaleRow } from '@/types/sale'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { qrSvg } from '@/lib/qr'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

// Fonction de formatage des devises
function formatCurrency(v: number): string {
    return new Intl.NumberFormat('fr-FR', {
        style: 'currency',
        currency: 'XOF',
        minimumFractionDigits: 0,
    }).format(v)
}

interface SaleDetailsProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    sale: SaleRow | null
    shop?: {
        id: number | string
        name?: string
        logo_url?: string | null
        phone?: string | null
        address?: string | null
    }
    // Quand true, déclenche automatiquement l'impression à l'ouverture
    autoPrint?: boolean
}

export default function SaleDetails({ open, onOpenChange, sale, shop, autoPrint }: SaleDetailsProps) {
    const totalAmount = useMemo(() => Number(sale?.total_amount ?? 0), [sale?.total_amount])
    const receiptNumber = sale?.receipt_number ?? `SALE-${sale?.id ?? ''}`

    const qr = useMemo(() => {
        if (!receiptNumber) return null
        try {
            return qrSvg(receiptNumber, 3, 2)
        } catch {
            return null
        }
    }, [receiptNumber])

    const products = useMemo(() => (sale?.details ?? []).filter(d => d.type === 'product'), [sale?.details])
    const services = useMemo(() => (sale?.details ?? []).filter(d => d.type === 'service'), [sale?.details])

    const productsSubtotal = useMemo(
        () => products.reduce((s, p) => s + Number(p.line_subtotal ?? Number(p.unit_price ?? 0) * Number(p.quantity ?? 1)), 0),
        [products]
    )
    const servicesSubtotal = useMemo(() => services.reduce((s, srv) => s + Number(srv.price ?? 0), 0), [services])

    // Calcul du montant de la promotion
    const promotionAmount = useMemo(() => {
        if (!sale?.promotion_label) return 0
        const subtotal = productsSubtotal + servicesSubtotal
        return subtotal - totalAmount
    }, [sale, productsSubtotal, servicesSubtotal, totalAmount])

    // Impression directe sans double déclenchement
    const printTicket = () => {
        if (!sale) return

        const printContent = generatePrintContent({
            sale,
            shop,
            qrSvgString: qr ?? '',
            promotionAmount
        })

        // Créer une iframe invisible
        const iframe = document.createElement('iframe')
        iframe.style.position = 'absolute'
        iframe.style.top = '-9999px'
        iframe.style.left = '-9999px'
        iframe.style.width = '0'
        iframe.style.height = '0'
        iframe.style.border = 'none'
        document.body.appendChild(iframe)

        // Injecter le contenu dans l'iframe
        const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document
        if (iframeDoc) {
            iframeDoc.open()
            iframeDoc.write(printContent)
            iframeDoc.close()
        }

        // Déclencher l'impression quand le contenu est prêt
        const tryPrint = () => {
            try {
                iframe.contentWindow?.focus()
                iframe.contentWindow?.print()
            } catch (e) {
                // journaliser l'erreur pour diagnostic sans interrompre le flux
                 
                console.error(e)
            } finally {
                // Nettoyer après un court délai
                setTimeout(() => {
                    if (iframe.parentNode) {
                        iframe.parentNode.removeChild(iframe)
                    }
                }, 1500)
            }
        }

        // Certains navigateurs nécessitent d'attendre l'événement onload
        if (iframe.contentWindow?.document?.readyState === 'complete') {
            tryPrint()
        } else {
            iframe.onload = tryPrint
            // Sécurité: force une tentative au cas où onload ne se déclenche pas
            setTimeout(tryPrint, 600)
        }
    }

    // Impression auto à l'ouverture (une seule fois par vente)
    const lastPrintedIdRef = useRef<number | string | null>(null)

    useEffect(() => {
        if (!autoPrint || !open || !sale) {
            return
        }
        if (lastPrintedIdRef.current === sale.id) {
            return
        }
        // Retarder légèrement pour laisser le DOM se stabiliser
        const t = setTimeout(() => {
            printTicket()
        }, 120)
        lastPrintedIdRef.current = sale.id ?? null
        return () => clearTimeout(t)
    }, [autoPrint, open, sale?.id])

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="sm:max-w-md">
                <SheetHeader className="border-b px-4 py-3">
                    <div className="flex items-center justify-between gap-3">
                        <SheetTitle>Reçu N°{receiptNumber}</SheetTitle>
                        <div className="flex items-center gap-2">
                            <Button variant="outline" onClick={() => onOpenChange(false)}>Fermer</Button>
                            <Button onClick={printTicket} disabled={!sale}>Imprimer</Button>
                        </div>
                    </div>
                </SheetHeader>

                <div className="px-4 py-4">
                    {sale ? (
                        <div className="space-y-3">
                            <div className="text-sm text-muted-foreground space-y-1">
                                <div>Date: <span className="text-foreground font-medium">{format(new Date(sale.sale_date), 'dd-MM-yyyy HH:mm', { locale: fr })}</span></div>
                                {sale.customer_name && <div>Client: <span className="text-foreground font-medium">{sale.customer_name}</span></div>}
                                {sale.hairdresser_name && <div>Coiffeur: <span className="text-foreground font-medium">{sale.hairdresser_name}</span></div>}
                            </div>

                            {products.length > 0 && (
                                <ReceiptSection title="Produits">
                                    {products.map((p, i) => (
                                        <ReceiptItem
                                            key={`p-${i}`}
                                            name={p.name}
                                            quantity={p.quantity}
                                            unitPrice={Number(p.unit_price ?? 0)}
                                            total={Number(p.line_subtotal ?? Number(p.unit_price ?? 0) * Number(p.quantity ?? 1))}
                                        />
                                    ))}
                                    <ReceiptTotal label="Sous-total produits" amount={productsSubtotal} />
                                </ReceiptSection>
                            )}

                            {services.length > 0 && (
                                <ReceiptSection title="Services">
                                    {services.map((s, i) => (
                                        <ReceiptItem key={`s-${i}`} name={s.name} total={Number(s.price ?? 0)} />
                                    ))}
                                    <ReceiptTotal label="Sous-total services" amount={servicesSubtotal} />
                                </ReceiptSection>
                            )}

                            <div className="border-t pt-3 space-y-2">
                                {sale.promotion_label && (
                                    <>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-muted-foreground">Promotion</span>
                                            <span>{sale.promotion_label}</span>
                                        </div>
                                        {promotionAmount > 0 && (
                                            <div className="flex justify-between text-sm">
                                                <span className="text-muted-foreground">Remise</span>
                                                <span className="text-green-600">-{formatCurrency(promotionAmount)}</span>
                                            </div>
                                        )}
                                    </>
                                )}
                                <div className="flex justify-between font-bold text-lg">
                                    <span>Total</span>
                                    <span>{formatCurrency(totalAmount)}</span>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="text-sm text-muted-foreground text-center py-8">Sélectionnez une vente…</div>
                    )}
                </div>
            </SheetContent>
        </Sheet>
    )
}

// Composants réutilisables
const ReceiptSection = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div className="rounded-md border">
        <div className="border-b px-3 py-2 text-sm font-medium bg-gray-50">{title}</div>
        <div className="p-3 text-sm space-y-2">{children}</div>
    </div>
)

const ReceiptItem = ({ name, quantity, unitPrice, total }: { name: string; quantity?: number; unitPrice?: number; total: number }) => (
    <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
            <div className="truncate">{name}</div>
            {quantity && unitPrice && <div className="text-xs text-muted-foreground">{quantity} × {formatCurrency(unitPrice)}</div>}
        </div>
        <div className="text-right font-medium">{formatCurrency(total)}</div>
    </div>
)

const ReceiptTotal = ({ label, amount }: { label: string; amount: number }) => (
    <div className="mt-2 flex items-center justify-between border-t pt-2">
        <div className="text-muted-foreground">{label}</div>
        <div className="font-medium">{formatCurrency(amount)}</div>
    </div>
)

// Génération du contenu d'impression
function generatePrintContent({ sale, shop, qrSvgString, promotionAmount }: {
    sale: SaleRow
    shop?: { name?: string | null; logo_url?: string | null; phone?: string | null; address?: string | null }
    qrSvgString: string
    promotionAmount: number
}) {
    const products = (sale.details ?? []).filter(d => d.type === 'product')
    const services = (sale.details ?? []).filter(d => d.type === 'service')
    const unitPriceOf = (item: { unit_price?: number; price?: number }): number => {
        return Number((item.unit_price ?? item.price ?? 0))
    }
    const productsSubtotal = products.reduce((s, p) => s + Number(p.line_subtotal ?? unitPriceOf(p) * Number(p.quantity ?? 1)), 0)
    const servicesSubtotal = services.reduce((s, srv) => s + Number(srv.price ?? 0), 0)
    const subtotal = productsSubtotal + servicesSubtotal
    const total = Number(sale.total_amount ?? 0)
    const paymentLabel = ((): string | null => {
        const pm = sale.payment_method
        if (!pm) { return null }
        if (pm === 'orange_money') { return 'Orange Money' }
        if (pm === 'caisse') { return 'Caisse' }
        return String(pm)
    })()

    const defaultLogo = '/img/logo 1.png'

    return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Ticket ${sale.receipt_number ?? sale.id}</title>
  <style>
    /* Mise en page optimisée pour imprimante thermique (80mm) */
    /* Largeur fixe 80mm; la hauteur reste automatique par défaut */
    @page { size: 80mm; margin: 0; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { height: auto; }
    body {
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
      font-family: 'Courier New', monospace;
      font-size: 10px;
      line-height: 1.35;
      color: #000;
      background: #fff;
      /* Utiliser une largeur utile qui tient compte du padding pour éviter tout dépassement */
      width: 76mm; /* 80mm - (2mm * 2) */
      margin: 0 auto;
      padding: 2mm;
    }
    .ticket {
      width: 100%;
      /* Empêcher la coupure du ticket sur plusieurs pages */
      break-inside: avoid;
      page-break-inside: avoid;
    }
    .header {
      text-align: center;
      margin-bottom: 8px;
      border-bottom: 2px dashed #000;
      padding-bottom: 6px;
    }
    .logo {
      max-width: 100%;
      max-height: 32px;
      margin: 0 auto 8px;
      display: block;
    }
    .shop-name {
      font-size: 13px;
      font-weight: bold;
      margin-bottom: 4px;
    }
    .receipt-number {
      font-size: 14px;
      font-weight: 700;
      letter-spacing: 1px;
      margin: 6px 0 2px;
    }
    .info { font-size: 9px; margin-bottom: 2px; }
    .section {
      margin: 8px 0;
      border-top: 1px dashed #000;
      padding-top: 6px;
      /* Eviter les sauts à l'intérieur de sections */
      break-inside: avoid;
      page-break-inside: avoid;
    }
    .section-title {
      font-weight: bold;
      font-size: 11px;
      margin-bottom: 5px;
      text-transform: uppercase;
    }
    .item {
      display: flex;
      justify-content: space-between;
      margin-bottom: 3px;
    }
    .item-name { flex: 1; text-align: left; }
    .item-details {
      font-size: 9px;
      color: #666;
      margin-left: 10px;
    }
    .item-price {
      text-align: right;
      min-width: 60px;
      font-variant-numeric: tabular-nums;
    }
    .subtotal {
      border-top: 1px dashed #000;
      margin-top: 5px;
      padding-top: 5px;
      font-weight: bold;
    }
    .total {
      border-top: 2px solid #000;
      margin-top: 8px;
      padding-top: 8px;
      font-size: 12px;
      font-weight: bold;
    }
    .promotion { color: #e53e3e; font-style: italic; }
    .promotion-amount { color: #28a745; font-weight: bold; }
    .qr-code {
      text-align: center;
      margin-top: 10px;
      padding-top: 8px;
      border-top: 2px dashed #000;
    }
    .qr-code svg { width: 120px; max-width: 100%; height: auto; }
    .footer {
      text-align: center;
      margin-top: 10px;
      font-size: 9px;
      color: #666;
    }
    .thank-you {
      font-size: 10px;
      font-weight: bold;
      margin-top: 8px;
      text-align: center;
    }

    @media print {
      /* Renforcer l'absence de coupure */
      .ticket, .section, .total, .footer { break-inside: avoid; page-break-inside: avoid; }
      html, body { height: auto !important; overflow: visible !important; }
    }
  </style>
</head>
<body>
  <div class="ticket">
    <div class="header">
      <img src="${shop?.logo_url || defaultLogo}" alt="Logo" class="logo" onerror="this.style.display='none'">
      ${shop?.name ? `<div class="shop-name">${escapeHtml(shop.name)}</div>` : ''}
      <div class="info">${format(new Date(sale.sale_date), 'dd-MM-yyyy HH:mm', { locale: fr })}</div>
      <div class="receipt-number">REÇU N° ${escapeHtml(String(sale.receipt_number ?? `000-${sale.id}`))}</div>
      ${shop?.phone ? `<div class="info">Tél: ${escapeHtml(shop.phone)}</div>` : ''}
      ${shop?.address ? `<div class="info">${escapeHtml(shop.address)}</div>` : ''}
      ${sale.customer_name ? `<div class="info">Client: ${escapeHtml(sale.customer_name)}</div>` : ''}
      ${sale.hairdresser_name ? `<div class="info">Coiffeur: ${escapeHtml(sale.hairdresser_name)}</div>` : ''}
      ${paymentLabel ? `<div class="info">Paiement: ${escapeHtml(paymentLabel)}</div>` : ''}
    </div>

    ${products.length ? `
    <div class="section">
      <div class="section-title">Produits</div>
      ${products.map(p => `
        <div class="item">
          <div class="item-name">
            ${escapeHtml(p.name)}
            ${p.quantity ? `<div class="item-details">${p.quantity} × ${formatCurrency(unitPriceOf(p))}</div>` : ''}
          </div>
          <div class="item-price">${formatCurrency(Number(p.line_subtotal ?? unitPriceOf(p) * Number(p.quantity ?? 1)))}</div>
        </div>
      `).join('')}
      <div class="item subtotal">
        <div>Sous-total produits</div>
        <div>${formatCurrency(productsSubtotal)}</div>
      </div>
    </div>
    ` : ''}

    ${services.length ? `
    <div class="section">
      <div class="section-title">Services</div>
      ${services.map(s => `
        <div class="item">
          <div class="item-name">${escapeHtml(s.name)}</div>
          <div class="item-price">${formatCurrency(Number(s.price ?? 0))}</div>
        </div>
      `).join('')}
      <div class="item subtotal">
        <div>Sous-total services</div>
        <div>${formatCurrency(servicesSubtotal)}</div>
      </div>
    </div>
    ` : ''}

    <div class="section">
      <div class="item subtotal">
        <div><strong>Sous-total</strong></div>
        <div><strong>${formatCurrency(subtotal)}</strong></div>
      </div>
      ${sale.promotion_label ? `
      <div class="item">
        <div>Promotion</div>
        <div>${escapeHtml(String(sale.promotion_label))}</div>
      </div>
      ` : ''}
      ${promotionAmount > 0 ? `
      <div class="item promotion-amount">
        <div>Remise</div>
        <div>-${formatCurrency(promotionAmount)}</div>
      </div>
      ` : ''}
    </div>

    <div class="section total">
      <div class="item">
        <div>TOTAL À PAYER</div>
        <div>${formatCurrency(total)}</div>
      </div>
    </div>

    ${qrSvgString ? `<div class="qr-code">${qrSvgString}</div>` : ''}

    <div class="footer">
      <div class="thank-you">MERCI POUR VOTRE VISITE !</div>
      <div>À bientôt</div>
    </div>
  </div>
</body>
</html>`
}

function escapeHtml(s: string): string {
    return s
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;')
}
