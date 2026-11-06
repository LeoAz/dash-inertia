import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { qr } from '@/actions/App/Http/Controllers/SaleController'
import type { SaleRow } from '@/types/sale'

/**
 * Impression des reçus sur rouleau thermique 80 mm (Xprinter P810, 203 dpi).
 *
 * Largeur : la tête n'imprime que 72 mm (576 points), et la zone imprimable démarre au bord gauche de la
 * page. Le contenu tient donc sur 68 mm, décalé de 2 mm : au-delà de 72 mm, le bord droit serait coupé.
 *
 * Hauteur : aucune taille de page n'est déclarée. Une page plus petite que le papier du pilote peut être
 * centrée sur la feuille, ce qui crée de grandes marges en haut et en bas. Sans `size`, le ticket démarre
 * en haut du papier choisi, et le format rouleau du pilote s'arrête à la fin du contenu.
 */
const CONTENT_WIDTH_MM = 68
const CONTENT_LEFT_MM = 2
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
 * La tête thermique ne sait imprimer que du noir pur : le gris est tramé et paraît pâle. Tout est donc en
 * graisse maximale, renforcé d'un fin contour, et le logo est forcé en noir et blanc. La hiérarchie repose
 * sur la taille, la casse et les filets.
 * La pile de polices couvre les postes de caisse Windows (Consolas), macOS/iPadOS (Menlo) et Android.
 */
const TICKET_CSS = `
@page{margin:0}
*{margin:0;padding:0;box-sizing:border-box}
html,body{background:#fff;color:#000}
body{font:800 11.5px/1.4 ui-monospace,Menlo,Consolas,'DejaVu Sans Mono','Liberation Mono','Courier New',monospace;-webkit-print-color-adjust:exact;print-color-adjust:exact;-webkit-text-stroke:.2px #000}
.ticket{width:${CONTENT_WIDTH_MM}mm;margin-left:${CONTENT_LEFT_MM}mm;padding:1mm 0 3mm}
.head{padding-bottom:2.5mm;text-align:center}
.logo{display:block;height:17mm;width:auto;margin:0 auto 2mm;filter:grayscale(1) brightness(.8) contrast(12)}
.contact{margin-top:.5mm;font-size:11px}
.block{padding:2.5mm 0;border-top:1.5px dashed #000}
.meta{display:grid;grid-template-columns:1fr auto;gap:.8mm 3mm;font-size:11px}
.meta div:nth-child(n+3){grid-column:1/-1}
.meta div{overflow-wrap:anywhere}
.cols{display:grid;grid-template-columns:6mm 1fr auto;gap:2mm;align-items:baseline}
.heading{padding:1.5mm 0;border-top:1.5px dashed #000;font-size:11px;letter-spacing:1px;text-transform:uppercase}
.line+.line{margin-top:1.5mm}
.name{min-width:0;overflow-wrap:anywhere}
.name small{display:block;font-size:11px}
.amount{font-variant-numeric:tabular-nums;text-align:right}
.sums{padding-left:8mm}
.row{display:flex;justify-content:space-between;align-items:center;gap:3mm}
.row+.row{margin-top:1mm}
.total{margin-top:2mm;font-size:13px;white-space:nowrap}
.sums .total:first-child{margin-top:0}
.box{padding:1mm 2.5mm;border:2px solid #000;font-size:15px;font-variant-numeric:tabular-nums}
.foot{text-align:center}
.qr{display:block;width:22mm;height:22mm;margin:0 auto 2.5mm}
.thanks{font-size:11.5px}
.bye{margin-top:.5mm;font-size:11px}
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
<style>${TICKET_CSS}</style></head><body><div class="ticket">
<div class="head"><img class="logo" src="${escapeHtml(logo)}" alt="" onerror="this.remove()">
${contact}</div>
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

/** Imprime le ticket dans une iframe hors écran, une fois ses images chargées. */
export async function printThermalTicket(html: string): Promise<void> {
    activeFrame?.remove()

    const frame = document.createElement('iframe')
    frame.setAttribute('aria-hidden', 'true')
    frame.style.cssText = 'position:fixed;left:-200mm;top:0;width:80mm;height:10mm;border:0'
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
