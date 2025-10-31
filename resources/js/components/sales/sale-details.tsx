import { useMemo, useRef } from 'react'
import type { SaleRow } from '@/types/sale'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { qrSvg } from '@/lib/qr'

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
}

export default function SaleDetails({ open, onOpenChange, sale, shop }: SaleDetailsProps) {
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

        // Nettoyer après impression
        setTimeout(() => {
            if (iframe.parentNode) {
                iframe.parentNode.removeChild(iframe)
            }
        }, 3000)
    }

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="sm:max-w-md">
                <SheetHeader className="border-b px-4 py-3">
                    <div className="flex items-center justify-between gap-3">
                        <SheetTitle>Reçu N°{receiptNumber}</SheetTitle>
                        <div className="flex items-center gap-2">
                            <Button variant="outline" onClick={() => onOpenChange(false)}>Fermer</Button>
                            <Button onClick={printTicket} disabled={!sale}>🖨️ Imprimer</Button>
                        </div>
                    </div>
                </SheetHeader>

                <div className="px-4 py-4">
                    {sale ? (
                        <div className="space-y-3">
                            <div className="text-sm text-muted-foreground space-y-1">
                                <div>Date: <span className="text-foreground font-medium">{new Date(sale.sale_date).toLocaleString('fr-FR')}</span></div>
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
    const productsSubtotal = products.reduce((s, p) => s + Number(p.line_subtotal ?? Number(p.unit_price ?? 0) * Number(p.quantity ?? 1)), 0)
    const servicesSubtotal = services.reduce((s, srv) => s + Number(srv.price ?? 0), 0)
    const subtotal = productsSubtotal + servicesSubtotal
    const total = Number(sale.total_amount ?? 0)

    const defaultLogo = '/logo.png'

    return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Ticket ${sale.receipt_number ?? sale.id}</title>
  <style>
    @page { size: 80mm auto; margin: 5mm; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Courier New', monospace;
      font-size: 12px;
      line-height: 1.4;
      color: #000;
      background: #fff;
      padding: 10px;
      width: 80mm;
    }
    .ticket { width: 100%; }
    .header {
      text-align: center;
      margin-bottom: 15px;
      border-bottom: 2px dashed #000;
      padding-bottom: 10px;
    }
    .logo {
      max-width: 100%;
      max-height: 60px;
      margin: 0 auto 8px;
      display: block;
    }
    .shop-name {
      font-size: 16px;
      font-weight: bold;
      margin-bottom: 4px;
    }
    .info { font-size: 10px; margin-bottom: 2px; }
    .section {
      margin: 12px 0;
      border-top: 1px dashed #000;
      padding-top: 8px;
    }
    .section-title {
      font-weight: bold;
      font-size: 13px;
      margin-bottom: 8px;
      text-transform: uppercase;
    }
    .item {
      display: flex;
      justify-content: space-between;
      margin-bottom: 4px;
    }
    .item-name { flex: 1; text-align: left; }
    .item-details {
      font-size: 10px;
      color: #666;
      margin-left: 10px;
    }
    .item-price {
      text-align: right;
      min-width: 60px;
    }
    .subtotal {
      border-top: 1px dashed #000;
      margin-top: 8px;
      padding-top: 8px;
      font-weight: bold;
    }
    .total {
      border-top: 2px solid #000;
      margin-top: 12px;
      padding-top: 12px;
      font-size: 14px;
      font-weight: bold;
    }
    .promotion { color: #e53e3e; font-style: italic; }
    .promotion-amount { color: #28a745; font-weight: bold; }
    .qr-code {
      text-align: center;
      margin-top: 20px;
      padding-top: 15px;
      border-top: 2px dashed #000;
    }
    .footer {
      text-align: center;
      margin-top: 15px;
      font-size: 10px;
      color: #666;
    }
    .thank-you {
      font-size: 12px;
      font-weight: bold;
      margin-top: 10px;
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="ticket">
    <div class="header">
      <img src="${shop?.logo_url || defaultLogo}" alt="Logo" class="logo" onerror="this.style.display='none'">
      ${shop?.name ? `<div class="shop-name">${escapeHtml(shop.name)}</div>` : ''}
      <div class="info">${new Date(sale.sale_date).toLocaleString('fr-FR')}</div>
      ${sale.receipt_number ? `<div class="info">Reçu N° ${escapeHtml(String(sale.receipt_number))}</div>` : ''}
      ${shop?.phone ? `<div class="info">Tél: ${escapeHtml(shop.phone)}</div>` : ''}
      ${shop?.address ? `<div class="info">${escapeHtml(shop.address)}</div>` : ''}
      ${sale.customer_name ? `<div class="info">Client: ${escapeHtml(sale.customer_name)}</div>` : ''}
      ${sale.hairdresser_name ? `<div class="info">Coiffeur: ${escapeHtml(sale.hairdresser_name)}</div>` : ''}
    </div>

    ${products.length ? `
    <div class="section">
      <div class="section-title">Produits</div>
      ${products.map(p => `
        <div class="item">
          <div class="item-name">
            ${escapeHtml(p.name)}
            ${p.quantity ? `<div class="item-details">${p.quantity} × ${formatCurrency(Number(p.unit_price ?? 0))}</div>` : ''}
          </div>
          <div class="item-price">${formatCurrency(Number(p.line_subtotal ?? Number(p.unit_price ?? 0) * Number(p.quantity ?? 1)))}</div>
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

  <script>
    window.onload = () => {
      setTimeout(() => {
        window.print();
        setTimeout(() => window.close(), 500);
      }, 250);
    };
  </script>
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
