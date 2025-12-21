import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { PrinterIcon, XIcon } from 'lucide-react';
import { useEffect, useRef } from 'react';

interface PrintTicketProps {
    sale: {
        id: string | number;
        receipt_number?: string;
        customer_name?: string;
        customer_phone?: string;
        sale_date: string;
        hairdresser_name?: string;
        payment_method?: 'orange_money' | 'caisse';
        total_amount: number;
        promotion_label?: string;
        details: Array<{
            type: 'product' | 'service';
            name: string;
            quantity?: number;
            price: number;
            line_subtotal?: number;
        }>;
    };
    onClose: () => void;
}

export default function PrintTicket({ sale, onClose }: PrintTicketProps) {
    const printRef = useRef<HTMLDivElement>(null);

    const handlePrint = () => {
        if (!printRef.current) return;

        const printWindow = window.open(
            '',
            '_blank',
            'width=320,height=600,left=0,top=0',
        );
        if (!printWindow) return;

        printWindow.document.write(`
      <html>
        <head>
          <title>Ticket #${sale.receipt_number || sale.id}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: "Courier New", monospace; font-size: 12px; padding: 8px; color: #000; }
            .header { text-align: center; margin-bottom: 12px; border-bottom: 1px dashed #000; padding-bottom: 8px; }
            .logo { display:block; margin: 0 auto 6px; width: 64px; height: auto; }
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
    `);

        printWindow.document.close();
        printWindow.focus();

        // Fermer automatiquement après impression et fermer la modale
        const closeAll = () => {
            try {
                printWindow.close();
            } catch {
                void 0;
            }
            onClose();
        };
        try {
            // Certains navigateurs déclenchent onafterprint sur la fenêtre d'impression
            // @ts-expect-error: onafterprint exists on Window in browser
            printWindow.onafterprint = closeAll;
        } catch {
            void 0;
        }

        // Fallback timer si onafterprint ne se déclenche pas
        setTimeout(closeAll, 1500);

        printWindow.print();
    };

    // Lancer automatiquement l'impression à l'ouverture de la fenêtre (direct print)
    useEffect(() => {
        // Appel immédiat pour déclencher l'impression dès le montage
        // Cela répond à « l'impression direct doit directement lancer l'impression »
        try {
            handlePrint();
        } catch {
            void 0;
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="flex max-h-[90vh] w-full max-w-md flex-col overflow-hidden rounded-lg bg-white shadow-xl">
                {/* Header */}
                <div className="flex shrink-0 items-center justify-between border-b p-4">
                    <h2 className="text-lg font-semibold">
                        Imprimer le ticket
                    </h2>
                    <Button variant="ghost" size="sm" onClick={onClose}>
                        <XIcon className="h-4 w-4" />
                    </Button>
                </div>

                {/* Contenu du ticket (caché mais imprimable) */}
                <div className="hidden">
                    <div ref={printRef}>
                        <div className="header">
                            <img
                                src="/img/logo%201.png"
                                alt="Logo"
                                className="logo"
                            />
                            <div className="text-sm font-bold">
                                SALON DE COIFFURE
                            </div>
                            <div className="text-xs">
                                Ticket #{sale.receipt_number || sale.id}
                            </div>
                            <div className="text-xs">
                                {format(
                                    new Date(sale.sale_date),
                                    'dd-MM-yyyy HH:mm',
                                    { locale: fr },
                                )}
                            </div>
                        </div>

                        {sale.customer_name && (
                            <div className="section">
                                <div>
                                    <span className="label">Client:</span>{' '}
                                    {sale.customer_name}
                                </div>
                                {sale.customer_phone && (
                                    <div>
                                        <span className="label">Tél:</span>{' '}
                                        {sale.customer_phone}
                                    </div>
                                )}
                            </div>
                        )}

                        {sale.hairdresser_name && (
                            <div className="section">
                                <div>
                                    <span className="label">Coiffeur:</span>{' '}
                                    {sale.hairdresser_name}
                                </div>
                            </div>
                        )}
                        <div className="section">
                            <div>
                                <span className="label">Paiement:</span>{' '}
                                {sale.payment_method === 'orange_money' ? 'Orange Money' : 'Caisse'}
                            </div>
                        </div>
                        <div className="section">
                            {sale.details.map((item, idx) => (
                                <div key={idx} className="item">
                                    <span>
                                        {item.name}
                                        {item.quantity &&
                                            item.quantity > 1 &&
                                            ` x${item.quantity}`}
                                    </span>
                                    <span>
                                        {new Intl.NumberFormat('fr-FR', {
                                            style: 'currency',
                                            currency: 'XOF',
                                        }).format(
                                            item.line_subtotal || item.price,
                                        )}
                                    </span>
                                </div>
                            ))}
                        </div>

                        {sale.promotion_label && (
                            <div className="item text-red-600">
                                <span>Remise ({sale.promotion_label})</span>
                                <span>
                                    -
                                    {new Intl.NumberFormat('fr-FR', {
                                        style: 'currency',
                                        currency: 'XOF',
                                    }).format(
                                        sale.details.reduce(
                                            (sum, it) =>
                                                sum +
                                                (it.line_subtotal || it.price),
                                            0,
                                        ) - sale.total_amount,
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
                <div className="flex-1 overflow-y-auto p-4">
                    <div className="rounded border bg-gray-50 p-3 text-xs">
                        <div className="mb-3 text-center">
                            <div className="font-bold">SALON DE COIFFURE</div>
                            <div className="text-gray-600">
                                Ticket #{sale.receipt_number || sale.id}
                            </div>
                            <div className="text-gray-600">
                                {format(
                                    new Date(sale.sale_date),
                                    'dd-MM-yyyy HH:mm',
                                    { locale: fr },
                                )}
                            </div>
                        </div>

                        {sale.customer_name && (
                            <div className="mb-2">
                                <div>Client: {sale.customer_name}</div>
                                {sale.customer_phone && (
                                    <div>Tél: {sale.customer_phone}</div>
                                )}
                            </div>
                        )}

                        {sale.hairdresser_name && (
                            <div>Coiffeur: {sale.hairdresser_name}</div>
                        )}
                        <div>Paiement: {sale.payment_method === 'orange_money' ? 'Orange Money' : 'Caisse'}</div>

                        <hr className="my-2 border-dashed" />

                        {sale.details.map((item, idx) => (
                            <div key={idx} className="flex justify-between">
                                <span>
                                    {item.name}
                                    {item.quantity &&
                                        item.quantity > 1 &&
                                        ` x${item.quantity}`}
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
                            <div className="mt-1 flex justify-between text-red-600">
                                <span>Remise ({sale.promotion_label})</span>
                                <span>
                                    -
                                    {new Intl.NumberFormat('fr-FR', {
                                        style: 'currency',
                                        currency: 'XOF',
                                    }).format(
                                        sale.details.reduce(
                                            (sum, it) =>
                                                sum +
                                                (it.line_subtotal || it.price),
                                            0,
                                        ) - sale.total_amount,
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

                        <div className="mt-3 text-center text-gray-600">
                            <div>Merci de votre visite !</div>
                            <div>À bientôt</div>
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex shrink-0 gap-2 border-t p-4">
                    <Button onClick={handlePrint} className="flex-1">
                        <PrinterIcon className="mr-2 h-4 w-4" />
                        Imprimer
                    </Button>
                    <Button
                        variant="outline"
                        onClick={onClose}
                        className="flex-1"
                    >
                        Fermer
                    </Button>
                </div>
            </div>
        </div>
    );
}
