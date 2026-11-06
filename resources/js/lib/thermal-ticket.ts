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

function renderLine(line: TicketLine, index: number): string {
    const quantity = Number(line.quantity ?? 1)
    const unit = Number(line.unit_price ?? line.price ?? 0)
    return `<div class="cols line"><span>${index + 1}.</span><span class="name">${quantity} × ${escapeHtml(line.name)}${
        quantity > 1 ? `<small>à ${formatAmount(unit)} l'unité</small>` : ''
    }</span><span class="amount">${formatAmount(lineTotal(line))}</span></div>`
}

/**
 * Design du reçu : en-tête centré, informations sur deux colonnes, tableau numéroté et total encadré.
 * La tête thermique ne sait imprimer que du noir pur (le gris est tramé et devient illisible) et les
 * polices mono fines s'y effacent : la hiérarchie repose donc sur la graisse, la casse et les filets.
 * La pile de polices couvre les postes de caisse Windows (Consolas), macOS/iPadOS (Menlo) et Android.
 */
const TICKET_CSS = `
*{margin:0;padding:0;box-sizing:border-box}
html,body{background:#fff;color:#000}
body{width:${PAPER_WIDTH_MM}mm;font:600 11.5px/1.4 ui-monospace,Menlo,Consolas,'DejaVu Sans Mono','Liberation Mono','Courier New',monospace;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.ticket{width:${PRINTABLE_WIDTH_MM}mm;margin:0 auto;padding:1mm 0 3mm}
.head{padding-bottom:2.5mm;text-align:center}
.logo{display:block;height:17mm;width:auto;margin:0 auto 2mm}
.shop{font-size:14px;font-weight:800;letter-spacing:2.5px;text-transform:uppercase}
.contact{margin-top:.5mm;font-size:10.5px}
.block{padding:2.5mm 0;border-top:1px dashed #000}
.meta{display:grid;grid-template-columns:1fr auto;gap:.8mm 3mm;font-size:10.5px}
.meta div:nth-child(n+3){grid-column:1/-1}
.meta div{overflow-wrap:anywhere}
.meta b{font-weight:800}
.cols{display:grid;grid-template-columns:6mm 1fr auto;gap:2mm;align-items:baseline}
.heading{padding:1.5mm 0;border-top:1px dashed #000;font-size:10px;font-weight:800;letter-spacing:1px;text-transform:uppercase}
.line+.line{margin-top:1.5mm}
.name{min-width:0;font-weight:800;overflow-wrap:anywhere}
.name small{display:block;font-size:10.5px;font-weight:600}
.amount{font-variant-numeric:tabular-nums;text-align:right}
.sums{padding-left:8mm}
.row{display:flex;justify-content:space-between;align-items:center;gap:3mm}
.row+.row{margin-top:1mm}
.total{margin-top:2mm;font-size:13px;font-weight:800}
.sums .total:first-child{margin-top:0}
.box{padding:1mm 2.5mm;border:2px solid #000;font-size:15px;font-variant-numeric:tabular-nums}
.foot{text-align:center}
.qr{display:block;width:22mm;height:22mm;margin:0 auto 2.5mm}
.thanks{font-size:11px;font-weight:800}
.bye{margin-top:.5mm;font-size:10.5px}
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
    const saleDate = new Date(sale.sale_date)

    const meta = [
        ['Date', format(saleDate, 'dd/MM/yyyy', { locale: fr })],
        ['Heure', format(saleDate, 'HH:mm', { locale: fr })],
        ['Client', sale.customer_name],
        ['Coiffeur', sale.hairdresser_name],
        ['Paiement', payment],
    ]
        .filter((entry): entry is [string, string] => Boolean(entry[1]))
        .map(([label, value]) => `<div>${label} : <b>${escapeHtml(value)}</b></div>`)
        .join('')

    const contact = [shop?.address, shop?.phone ? `Tél : ${shop.phone}` : null]
        .filter(Boolean)
        .map((v) => `<div class="contact">${escapeHtml(String(v))}</div>`)
        .join('')

    return `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><title>Reçu ${escapeHtml(receipt)}</title>
<style>${TICKET_CSS}</style><style id="page-size"></style></head><body><div class="ticket">
<div class="head"><img class="logo" src="${escapeHtml(logo)}" alt="" onerror="this.remove()">
${shop?.name ? `<div class="shop">${escapeHtml(shop.name)}</div>` : ''}${contact}</div>
<div class="block meta">${meta}<div>Reçu n° : <b>${escapeHtml(receipt)}</b></div></div>
${lines.length ? `<div class="cols heading"><span>N°</span><span>Désignation</span><span>F CFA</span></div>
<div class="block">${lines.map(renderLine).join('')}</div>` : ''}
<div class="block sums">${discount > 0 ? `<div class="row"><span>Sous-total</span><span class="amount">${formatAmount(subtotal)}</span></div>
<div class="row"><span>Remise</span><span class="amount">-${formatAmount(discount)}</span></div>` : ''}
<div class="row total"><span>Total :</span><span class="box">${formatCurrency(total)}</span></div></div>
<div class="block foot"><img class="qr" src="${escapeHtml(qrCode)}" alt="" onerror="this.remove()">
<div class="thanks">Merci pour votre visite !</div><div class="bye">À très bientôt</div></div>
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
