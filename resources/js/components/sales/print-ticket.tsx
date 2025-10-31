import { useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { XIcon, PrinterIcon } from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

interface PrintTicketProps {
    sale: {
        id: string | number
        receipt_number?: string
        customer_name?: string
        customer_phone?: string
        sale_date: string
        hairdresser_name?: string
        total_amount: number
        promotion_label?: string
        details: Array<{
            type: 'product' | 'service'
            name: string
            quantity?: number
            price: number
            line_subtotal?: number
        }>
    }
    onClose: () => void
}

export default function PrintTicket({ sale, onClose }: PrintTicketProps) {
    const printRef = useRef<HTMLDivElement>(null)

    const handlePrint = () => {
        if (!printRef.current) return

        const printWindow = window.open('', '_blank', 'width=320,height=600,left=0,top=0')
        if (!printWindow) return

        printWindow.document.write(`
      <html>
        <head>
          <title>Ticket #${sale.receipt_number || sale.id}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: "Courier New", monospace; font-size: 12px; padding: 8px; color: #000; }
            .header { text-align: center; margin-bottom: 12px; border-bottom: 1px dashed #000; padding-bottom: 8px; }
            .item { display: flex; justify-content: space-between; margin: 4px 0; }
            .total { border-top: 1px dashed #000; padding-top: 6px; font-weight: bold; margin-top: 8px; }
            .footer { text-align: center; margin-top: 12px; font-size: 10px; }
            .section { margin-bottom: 8px; }
            .label { font-weight: bold; }
          </style>
        </head>
        <body>
          ${printRef.current.innerHTML}
        </body>
      </html>
    `)

        printWindow.document.close()
        printWindow.focus()
        printWindow.print()
        printWindow.close()
    }

    return (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b shrink-0">
                    <h2 className="text-lg font-semibold">Imprimer le ticket</h2>
                    <Button variant="ghost" size="sm" onClick={onClose}>
                        <XIcon className="h-4 w-4" />
                    </Button>
                </div>

                {/* Contenu du ticket (caché mais imprimable) */}
                <div className="hidden">
                    <div ref={printRef}>
                        <div className="header">
                            <div className="font-bold text-sm">SALON DE COIFFURE</div>
                            <div className="text-xs">Ticket #{sale.receipt_number || sale.id}</div>
                            <div className="text-xs">
                                {format(new Date(sale.sale_date), 'dd/MM/yyyy HH:mm', { locale: fr })}
                            </div>
                        </div>

                        {sale.customer_name && (
                            <div className="section">
                                <div><span className="label">Client:</span> {sale.customer_name}</div>
                                {sale.customer_phone && <div><span className="label">Tél:</span> {sale.customer_phone}</div>}
                            </div>
                        )}

                        {sale.hairdresser_name && (
                            <div className="section">
                                <div><span className="label">Coiffeur:</span> {sale.hairdresser_name}</div>
                            </div>
                        )}

                        <div className="section">
                            {sale.details.map((item, idx) => (
                                <div key={idx} className="item">
                  <span>
                    {item.name}
                      {item.quantity && item.quantity > 1 && ` x${item.quantity}`}
                  </span>
                                    <span>
                    {new Intl.NumberFormat('fr-FR', {
                        style: 'currency',
                        currency: 'XOF',
                    }).format(item.line_subtotal || item.price)}
                  </span>
                                </div>
                            ))}
                        </div>

                        {sale.promotion_label && (
                            <div className="item text-red-600">
                                <span>Remise ({sale.promotion_label})</span>
                                <span>
                  -{new Intl.NumberFormat('fr-FR', {
                                    style: 'currency',
                                    currency: 'XOF',
                                }).format(
                                    sale.details.reduce((sum, it) => sum + (it.line_subtotal || it.price), 0) -
                                    sale.total_amount
                                )}
                </span>
                            </div>
                        )}

                        <div className="total item">
                            <span>TOTAL:</span>
                            <span>
                {new Intl.NumberFormat('fr-FR', {
                    style: 'currency',
                    currency: 'XOF',
                }).format(sale.total_amount)}
              </span>
                        </div>

                        <div className="footer">
                            <div>Merci de votre visite !</div>
                            <div>À bientôt</div>
                        </div>
                    </div>
                </div>

                {/* Aperçu visible */}
                <div className="p-4 overflow-y-auto flex-1">
                    <div className="border rounded p-3 bg-gray-50 text-xs">
                        <div className="text-center mb-3">
                            <div className="font-bold">SALON DE COIFFURE</div>
                            <div className="text-gray-600">Ticket #{sale.receipt_number || sale.id}</div>
                            <div className="text-gray-600">
                                {format(new Date(sale.sale_date), 'dd/MM/yyyy HH:mm', { locale: fr })}
                            </div>
                        </div>

                        {sale.customer_name && (
                            <div className="mb-2">
                                <div>Client: {sale.customer_name}</div>
                                {sale.customer_phone && <div>Tél: {sale.customer_phone}</div>}
                            </div>
                        )}

                        {sale.hairdresser_name && <div>Coiffeur: {sale.hairdresser_name}</div>}

                        <hr className="my-2 border-dashed" />

                        {sale.details.map((item, idx) => (
                            <div key={idx} className="flex justify-between">
                <span>
                  {item.name}
                    {item.quantity && item.quantity > 1 && ` x${item.quantity}`}
                </span>
                                <span>
                  {new Intl.NumberFormat('fr-FR', {
                      style: 'currency',
                      currency: 'XOF',
                  }).format(item.line_subtotal || item.price)}
                </span>
                            </div>
                        ))}

                        {sale.promotion_label && (
                            <div className="flex justify-between text-red-600 mt-1">
                                <span>Remise ({sale.promotion_label})</span>
                                <span>
                  -{new Intl.NumberFormat('fr-FR', {
                                    style: 'currency',
                                    currency: 'XOF',
                                }).format(
                                    sale.details.reduce((sum, it) => sum + (it.line_subtotal || it.price), 0) -
                                    sale.total_amount
                                )}
                </span>
                            </div>
                        )}

                        <hr className="my-2 border-dashed" />

                        <div className="flex justify-between font-bold">
                            <span>TOTAL:</span>
                            <span>
                {new Intl.NumberFormat('fr-FR', {
                    style: 'currency',
                    currency: 'XOF',
                }).format(sale.total_amount)}
              </span>
                        </div>

                        <div className="text-center mt-3 text-gray-600">
                            <div>Merci de votre visite !</div>
                            <div>À bientôt</div>
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 p-4 border-t shrink-0">
                    <Button onClick={handlePrint} className="flex-1">
                        <PrinterIcon className="h-4 w-4 mr-2" />
                        Imprimer
                    </Button>
                    <Button variant="outline" onClick={onClose} className="flex-1">
                        Fermer
                    </Button>
                </div>
            </div>
        </div>
    )
}
