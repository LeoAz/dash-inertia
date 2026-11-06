import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { qr } from '@/actions/App/Http/Controllers/SaleController'
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
    return `<div class="line"><div class="row"><span class="name">${escapeHtml(line.name)}</span><span class="amount">${formatCurrency(lineTotal(line))}</span></div>${
        quantity > 1 ? `<div class="detail">${quantity} × ${formatCurrency(unit)}</div>` : ''
    }</div>`
}

/**
 * Design du reçu : une colonne centrée en chasse fixe, rythmée par le blanc et de fins filets.
 * La tête thermique ne sait imprimer que du noir pur (le gris est tramé et devient illisible) et les
 * polices mono fines s'y effacent : la hiérarchie repose donc sur la graisse, la casse et l'interlettrage.
 * La pile de polices couvre les postes de caisse Windows (Consolas), macOS/iPadOS (Menlo) et Android.
 */
const TICKET_CSS = `
*{margin:0;padding:0;box-sizing:border-box}
html,body{background:#fff;color:#000}
body{width:${PAPER_WIDTH_MM}mm;font:600 12px/1.4 ui-monospace,Menlo,Consolas,'DejaVu Sans Mono','Liberation Mono','Courier New',monospace;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.ticket{width:${PRINTABLE_WIDTH_MM}mm;margin:0 auto;padding:1mm 0 3mm}
.head{text-align:center}
.logo{display:block;height:17mm;width:auto;margin:0 auto 2mm}
.shop{font-size:14px;font-weight:800;letter-spacing:3px;text-transform:uppercase}
.contact{margin-top:.5mm;font-size:10.5px;letter-spacing:.3px}
.block{margin-top:3mm;padding-top:3mm;border-top:1px dashed #000}
.row{display:flex;justify-content:space-between;align-items:baseline;gap:4mm}
.meta .row+.row{margin-top:.8mm}
.label{flex:none;font-size:10px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase}
.value{min-width:0;text-align:right;font-weight:700;overflow-wrap:anywhere}
.line+.line{margin-top:1.5mm}
.name{min-width:0;font-weight:700;overflow-wrap:anywhere}
.amount{flex:none;font-variant-numeric:tabular-nums}
.detail{margin-top:.3mm;font-size:10.5px}
.sums .row+.row{margin-top:.8mm}
.total{margin-top:3mm;padding:2mm 0;border-top:2px solid #000;border-bottom:2px solid #000;font-weight:800}
.total .label{font-size:12px;font-weight:800;letter-spacing:4px}
.total .amount{font-size:17px}
.foot{margin-top:3.5mm;text-align:center}
.qr{display:block;width:22mm;height:22mm;margin:0 auto 2mm}
.thanks{font-size:11px;font-weight:800;letter-spacing:2.5px;text-transform:uppercase}
.bye{margin-top:.5mm;font-size:10.5px}
`

function metaRow(label: string, value: string): string {
    return `<div class="row"><span class="label">${label}</span><span class="value">${escapeHtml(value)}</span></div>`
}

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
        ['Reçu', receipt],
        ['Date', format(new Date(sale.sale_date), 'dd/MM/yyyy HH:mm', { locale: fr })],
        ['Client', sale.customer_name],
        ['Coiffeur', sale.hairdresser_name],
        ['Paiement', payment],
    ]
        .filter((entry): entry is [string, string] => Boolean(entry[1]))
        .map(([label, value]) => metaRow(label, value))
        .join('')

    const contact = [shop?.phone, shop?.address].filter(Boolean).map((v) => `<div class="contact">${escapeHtml(String(v))}</div>`).join('')

    return `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><title>Reçu ${escapeHtml(receipt)}</title>
<style>${TICKET_CSS}</style><style id="page-size"></style></head><body><div class="ticket">
<div class="head"><img class="logo" src="${escapeHtml(logo)}" alt="" onerror="this.remove()">
${shop?.name ? `<div class="shop">${escapeHtml(shop.name)}</div>` : ''}${contact}</div>
<div class="block meta">${meta}</div>
${lines.length ? `<div class="block">${lines.map(renderLine).join('')}</div>` : ''}
${discount > 0 ? `<div class="block sums"><div class="row"><span class="label">Sous-total</span><span class="amount">${formatCurrency(subtotal)}</span></div>
<div class="row"><span class="label">Remise</span><span class="amount">-${formatCurrency(discount)}</span></div></div>` : ''}
<div class="total row"><span class="label">TOTAL</span><span class="amount">${formatCurrency(total)}</span></div>
<div class="foot"><img class="qr" src="${escapeHtml(qrCode)}" alt="" onerror="this.remove()">
<div class="thanks">Merci de votre visite</div><div class="bye">À très bientôt</div></div>
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
