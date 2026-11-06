import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import type { SaleRow } from '@/types/sale'

/**
 * Impression des reçus sur rouleau thermique 80 mm (Xprinter P810, 203 dpi, 576 points = 72 mm utiles).
 *
 * Sur un rouleau, chaque millimètre de « page » est du papier consommé. La hauteur de la page est donc
 * mesurée sur le contenu réel, puis déclarée à l'impression : jamais de valeur fixe ni de `size: 80mm`
 * seul, que le CSS interprète comme une page carrée de 80 × 80 mm.
 */
const PAPER_WIDTH_MM = 80
const PRINTABLE_WIDTH_MM = 72
const MM_PER_CSS_PX = 25.4 / 96
/** Marge d'arrondi : évite qu'une fraction de pixel ne crée une seconde page. */
const HEIGHT_SAFETY_MM = 1
const IMAGE_TIMEOUT_MS = 1500
/** `afterprint` n'est pas émis partout (iOS) : l'iframe est retirée au plus tard après ce délai. */
const CLEANUP_TIMEOUT_MS = 60_000

export interface TicketShop {
    name?: string | null
    logo_url?: string | null
    phone?: string | null
    address?: string | null
}

export function formatCurrency(value: number): string {
    return new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 0 }).format(value).replace(/\s/g, ' ') + ' F CFA'
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
        quantity > 1 ? `<small>${quantity} × ${formatCurrency(unit)}</small>` : ''
    }</span><span class="amount">${formatCurrency(lineTotal(line))}</span></div>`
}

/**
 * Design du reçu. La tête thermique ne sait imprimer que du noir pur (le gris est tramé et devient
 * illisible) : la hiérarchie repose sur la graisse, la taille et le bandeau inversé du total.
 */
const TICKET_CSS = `
*{margin:0;padding:0;box-sizing:border-box}
html,body{background:#fff;color:#000}
body{width:${PAPER_WIDTH_MM}mm;font:500 12px/1.3 Arial,Helvetica,sans-serif;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.ticket{width:${PRINTABLE_WIDTH_MM}mm;margin:0 auto;padding-bottom:3mm}
.brand{display:flex;align-items:center;gap:3mm}
.logo{flex:none;height:15mm;width:auto}
.shop{font-size:15px;font-weight:800;letter-spacing:.2px}
.contact{font-size:10.5px}
.ref{display:flex;justify-content:space-between;align-items:baseline;gap:2mm;margin-top:1.5mm;padding:1mm 0;border-top:2px solid #000;border-bottom:2px solid #000;font-weight:800}
.ref span:last-child{font-weight:500;font-size:11px;white-space:nowrap}
.meta{display:grid;grid-template-columns:1fr 1fr;gap:1mm 3mm;margin-top:1.5mm}
.meta dt{font-size:9px;font-weight:700;letter-spacing:.6px;text-transform:uppercase}
.meta dd{font-weight:700;overflow-wrap:anywhere}
.lines{margin-top:1.5mm;border-top:1px solid #000}
.row{display:flex;justify-content:space-between;gap:3mm;padding-top:1mm}
.name{min-width:0;font-weight:700;overflow-wrap:anywhere}
.name small{display:block;font-size:10.5px;font-weight:500}
.amount{flex:none;font-variant-numeric:tabular-nums}
.sums{margin-top:1mm;border-top:1px dashed #000}
.total{display:flex;justify-content:space-between;align-items:center;margin-top:1.5mm;padding:1.5mm 2.5mm;background:#000;color:#fff;font-weight:800}
.total span:first-child{font-size:12px;letter-spacing:1.5px}
.total span:last-child{font-size:17px;font-variant-numeric:tabular-nums}
.thanks{margin-top:1.5mm;text-align:center;font-weight:700}
`

export function buildTicketHtml(sale: SaleRow, shop: TicketShop | undefined, origin = ''): string {
    const details = sale.details ?? []
    const lines = [...details.filter((d) => d.type === 'service'), ...details.filter((d) => d.type === 'product')]
    const subtotal = details.reduce((sum, line) => sum + lineTotal(line), 0)
    const total = Number(sale.total_amount ?? 0)
    const discount = sale.promotion_label ? subtotal - total : 0
    const receipt = String(sale.receipt_number ?? sale.id)
    const logo = shop?.logo_url || `${origin}/img/logo%201.png`
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
<style>${TICKET_CSS}</style><style id="page-size"></style></head><body><div class="ticket">
<div class="brand"><img class="logo" src="${escapeHtml(logo)}" alt="" onerror="this.remove()"><div>
${shop?.name ? `<div class="shop">${escapeHtml(shop.name)}</div>` : ''}${contact}</div></div>
<div class="ref"><span>REÇU ${escapeHtml(receipt)}</span><span>${format(new Date(sale.sale_date), 'dd/MM/yyyy HH:mm', { locale: fr })}</span></div>
${meta ? `<dl class="meta">${meta}</dl>` : ''}
${lines.length ? `<div class="lines">${lines.map(renderLine).join('')}</div>` : ''}
${discount > 0 ? `<div class="sums"><div class="row"><span>Sous-total</span><span class="amount">${formatCurrency(subtotal)}</span></div>
<div class="row"><span class="name">Remise · ${escapeHtml(String(sale.promotion_label))}</span><span class="amount">-${formatCurrency(discount)}</span></div></div>` : ''}
<div class="total"><span>TOTAL</span><span>${formatCurrency(total)}</span></div>
<div class="thanks">Merci pour votre visite ! À très bientôt</div>
</div></body></html>`
}

async function waitForImages(doc: Document): Promise<void> {
    const pending = Array.from(doc.images)
        .filter((image) => !image.complete)
        .map((image) => new Promise((resolve) => {
            image.addEventListener('load', resolve, { once: true })
            image.addEventListener('error', resolve, { once: true })
        }))
    await Promise.race([Promise.all(pending), new Promise((resolve) => setTimeout(resolve, IMAGE_TIMEOUT_MS))])
}

let activeFrame: HTMLIFrameElement | null = null

/** Imprime le ticket dans une iframe hors écran, à la hauteur exacte de son contenu. */
export async function printThermalTicket(html: string): Promise<void> {
    activeFrame?.remove()

    const frame = document.createElement('iframe')
    frame.setAttribute('aria-hidden', 'true')
    frame.style.cssText = `position:fixed;left:-200mm;top:0;width:${PAPER_WIDTH_MM}mm;height:10mm;border:0`
    document.body.appendChild(frame)
    activeFrame = frame

    const win = frame.contentWindow
    const doc = frame.contentDocument
    if (!win || !doc) {
        frame.remove()
        return
    }

    doc.open()
    doc.write(html)
    doc.close()

    await waitForImages(doc)
    await doc.fonts?.ready

    const ticket = doc.querySelector('.ticket')
    const heightMm = Math.ceil((ticket?.getBoundingClientRect().height ?? 0) * MM_PER_CSS_PX) + HEIGHT_SAFETY_MM
    const pageSize = doc.getElementById('page-size')
    if (pageSize) {
        pageSize.textContent = `@page{size:${PAPER_WIDTH_MM}mm ${heightMm}mm;margin:0}`
    }

    const cleanup = () => {
        frame.remove()
        if (activeFrame === frame) {
            activeFrame = null
        }
    }
    win.addEventListener('afterprint', cleanup, { once: true })
    setTimeout(cleanup, CLEANUP_TIMEOUT_MS)

    win.focus()
    win.print()
}
