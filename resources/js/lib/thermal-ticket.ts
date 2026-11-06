import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { qr } from '@/actions/App/Http/Controllers/SaleController'
import type { SaleRow } from '@/types/sale'

/**
 * Impression des reçus sur rouleau thermique 80 mm (Xprinter P810, 203 dpi).
 *
 * Largeur : sur Android, le service ESCPrint agrandit le ticket et coupe le bord droit, sans que l'aperçu
 * le montre. Rétrécir le ticket ne suffit pas : l'agrandissement augmente d'autant. Les filets gardent
 * donc toute la largeur, et les textes s'arrêtent avant le bord droit, là où l'impression coupe.
 *
 * Hauteur : aucune taille de page n'est déclarée. Une page plus petite que le papier du pilote peut être
 * centrée sur la feuille, ce qui crée de grandes marges en haut et en bas. Sans `size`, le ticket démarre
 * en haut du papier choisi.
 */
const MAX_CONTENT_WIDTH_MM = 58
const SIDE_MARGIN_MM = 2
/** Retrait des textes à droite : la coupure observée se situe vers 55 mm, pour un contenu de 60 mm. */
const TEXT_RIGHT_INSET_MM = 8
const IMAGE_TIMEOUT_MS = 1500
const PRINT_ROOT_ID = 'thermal-ticket-print'
const PRINT_STYLE_ID = 'thermal-ticket-print-style'

export interface TicketShop {
    name?: string | null
    logo_url?: string | null
    phone?: string | null
    address?: string | null
}

function formatAmount(value: number): string {
    return new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 0 }).format(value).replace(/\s/g, ' ')
}

export function formatCurrency(value: number): string {
    return `${formatAmount(value)} F CFA`
}

function escapeHtml(value: string): string {
    return value
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;')
}

type TicketLine = NonNullable<SaleRow['details']>[number]

export function lineTotal(line: TicketLine): number {
    const unit = Number(line.unit_price ?? line.price ?? 0)
    return Number(line.line_subtotal ?? unit * Number(line.quantity ?? 1))
}

function renderLine(line: TicketLine): string {
    const quantity = Number(line.quantity ?? 1)
    const unit = Number(line.unit_price ?? line.price ?? 0)
    return `<div class="row"><span class="name">${escapeHtml(line.name)}${
        quantity > 1 ? `<small>${quantity} × ${formatAmount(unit)}</small>` : ''
    }</span><span class="amount">${formatAmount(lineTotal(line))}</span></div>`
}

/**
 * Design du reçu. La tête thermique ne sait imprimer que du noir pur : le gris est tramé et paraît pâle.
 * Tout est donc en graisse maximale, renforcé d'un fin contour, et le logo est forcé en noir et blanc.
 * Aucun aplat noir : la tête le rend gris et tramé. La hiérarchie repose sur la taille et les filets.
 * La pile de polices couvre les postes de caisse Windows (Consolas), macOS/iPadOS (Menlo) et Android.
 */
const TICKET_CSS = `
@page{margin:0}
*{margin:0;padding:0;box-sizing:border-box}
html,body{background:#fff;color:#000}
body{font:800 12px/1.3 ui-monospace,Menlo,Consolas,'DejaVu Sans Mono','Liberation Mono','Courier New',monospace;-webkit-print-color-adjust:exact;print-color-adjust:exact;-webkit-text-stroke:.2px #000}
.ticket{max-width:${MAX_CONTENT_WIDTH_MM}mm;margin:0 ${SIDE_MARGIN_MM}mm;padding-bottom:1mm}
.brand{padding-right:${TEXT_RIGHT_INSET_MM}mm;text-align:center}
.logo{display:block;height:15mm;width:auto;margin:0 auto 1mm;filter:grayscale(1) brightness(.8) contrast(12)}
.contact{font-size:11px}
.ref{display:flex;flex-wrap:wrap;justify-content:space-between;align-items:baseline;gap:0 2mm;margin-top:1.5mm;padding:1mm ${TEXT_RIGHT_INSET_MM}mm 1mm 0;border-top:2px solid #000;border-bottom:2px solid #000}
.ref span:last-child{font-size:11px;white-space:nowrap}
.meta{display:grid;grid-template-columns:1fr 1fr;gap:1mm 3mm;margin-top:1.5mm;padding-right:${TEXT_RIGHT_INSET_MM}mm}
.meta dt{font-size:11px;letter-spacing:.6px;text-transform:uppercase}
.meta dd{overflow-wrap:anywhere}
.lines{margin-top:1.5mm;border-top:1.5px solid #000}
.row{display:flex;justify-content:space-between;gap:3mm;padding:1mm ${TEXT_RIGHT_INSET_MM}mm 0 0}
.name{min-width:0;overflow-wrap:anywhere}
.name small{display:block;font-size:11px}
.amount{flex:none;font-variant-numeric:tabular-nums}
.sums{margin-top:1mm;border-top:1.5px dashed #000}
.total{display:flex;justify-content:space-between;align-items:center;margin-top:1.5mm;padding:1.5mm ${TEXT_RIGHT_INSET_MM}mm 1.5mm 0;border-top:2px solid #000;border-bottom:2px solid #000;white-space:nowrap}
.total span:first-child{font-size:12px;letter-spacing:1.5px}
.total span:last-child{font-size:16px;font-variant-numeric:tabular-nums}
.qr{display:block;position:relative;left:-${TEXT_RIGHT_INSET_MM / 2}mm;width:22mm;height:22mm;margin:2.5mm auto 1.5mm}
.thanks{padding-right:${TEXT_RIGHT_INSET_MM}mm;text-align:center}
`

export function buildTicketHtml(sale: SaleRow, shop: TicketShop | undefined, origin = ''): string {
    const details = sale.details ?? []
    const lines = [...details.filter((d) => d.type === 'service'), ...details.filter((d) => d.type === 'product')]
    const subtotal = details.reduce((sum, line) => sum + lineTotal(line), 0)
    const total = Number(sale.total_amount ?? 0)
    const discount = sale.promotion_label ? subtotal - total : 0
    const receipt = String(sale.receipt_number ?? sale.id)
    const logo = shop?.logo_url || `${origin}/img/logo%201.png`
    const qrCode = `${origin}${qr.url({ shop: Number(sale.shop_id), sale: Number(sale.id) })}`
    const payment = sale.payment_method === 'orange_money' ? 'Orange Money' : sale.payment_method === 'caisse' ? 'Caisse' : null

    const meta = [
        ['Client', sale.customer_name],
        ['Coiffeur', sale.hairdresser_name],
        ['Paiement', payment],
    ]
        .filter((entry): entry is [string, string] => Boolean(entry[1]))
        .map(([label, value]) => `<div><dt>${label}</dt><dd>${escapeHtml(value)}</dd></div>`)
        .join('')

    const contact = [shop?.phone, shop?.address].filter(Boolean).map((v) => `<div class="contact">${escapeHtml(String(v))}</div>`).join('')

    return `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><title>Reçu ${escapeHtml(receipt)}</title>
<style>${TICKET_CSS}</style></head><body><div class="ticket">
<div class="brand"><img class="logo" src="${escapeHtml(logo)}" alt="" onerror="this.remove()">${contact}</div>
<div class="ref"><span>REÇU ${escapeHtml(receipt)}</span><span>${format(new Date(sale.sale_date), 'dd/MM/yyyy HH:mm', { locale: fr })}</span></div>
${meta ? `<dl class="meta">${meta}</dl>` : ''}
${lines.length ? `<div class="lines">${lines.map(renderLine).join('')}</div>` : ''}
${discount > 0 ? `<div class="sums"><div class="row"><span>Sous-total</span><span class="amount">${formatAmount(subtotal)}</span></div>
<div class="row"><span class="name">Remise · ${escapeHtml(String(sale.promotion_label))}</span><span class="amount">-${formatAmount(discount)}</span></div></div>` : ''}
<div class="total"><span>TOTAL</span><span>${formatAmount(total)}</span></div>
<img class="qr" src="${escapeHtml(qrCode)}" alt="" onerror="this.remove()">
<div class="thanks">Merci pour votre visite !<br>À très bientôt</div>
</div></body></html>`
}

async function waitForImages(root: HTMLElement): Promise<void> {
    const pending = Array.from(root.querySelectorAll('img'))
        .filter((image) => !image.complete)
        .map((image) => new Promise((resolve) => {
            image.addEventListener('load', resolve, { once: true })
            image.addEventListener('error', resolve, { once: true })
        }))
    await Promise.race([Promise.all(pending), new Promise((resolve) => setTimeout(resolve, IMAGE_TIMEOUT_MS))])
}

function removePrintedTicket(): void {
    document.getElementById(PRINT_ROOT_ID)?.remove()
    document.getElementById(PRINT_STYLE_ID)?.remove()
}

/**
 * Imprime le ticket depuis la page elle-même, en masquant tout le reste à l'impression.
 *
 * Pas d'iframe : certains navigateurs Android ignorent `iframe.print()` et impriment la page principale.
 * Le ticket reste en place, invisible à l'écran, jusqu'au prochain toucher de la page : sur Android, le
 * rendu peut être refait tant que la fenêtre d'impression est ouverte. Il doit partir ensuite, sinon les
 * rapports, imprimés depuis la même page, sortiraient comme ce ticket.
 */
export async function printThermalTicket(html: string): Promise<void> {
    const ticket = new DOMParser().parseFromString(html, 'text/html')

    removePrintedTicket()

    const style = document.createElement('style')
    style.id = PRINT_STYLE_ID
    style.textContent = `@media screen{#${PRINT_ROOT_ID}{display:none}}
@media print{body>*:not(#${PRINT_ROOT_ID}){display:none!important}
html,body{height:auto!important;margin:0!important;overflow:visible!important}
${ticket.querySelector('style')?.textContent ?? ''}}`

    const root = document.createElement('div')
    root.id = PRINT_ROOT_ID
    root.innerHTML = ticket.body.innerHTML

    document.head.appendChild(style)
    document.body.appendChild(root)

    await waitForImages(root)
    await document.fonts?.ready

    window.print()
    window.addEventListener('pointerdown', removePrintedTicket, { once: true })
}
