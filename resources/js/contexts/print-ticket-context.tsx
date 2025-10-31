import React, { createContext, useContext, useState, ReactNode } from 'react';
import PrintTicket from '@/components/sales/print-ticket';
import type { SaleRow } from '@/types/sale';
interface PrintTicketContextType {
    printTicket: (sale: SaleRow) => void;
}

const PrintTicketContext = createContext<PrintTicketContextType | undefined>(undefined);

interface PrintTicketProviderProps {
    children: ReactNode;
}

export function PrintTicketProvider({ children }: PrintTicketProviderProps) {
    const [ticket, setTicket] = useState<SaleRow | null>(null);

    const printTicket = (sale: SaleRow) => {
        setTicket(sale);
    };

    return (
        <PrintTicketContext.Provider value={{ printTicket }}>
            {children}
            {ticket && <PrintTicket sale={ticket} onClose={() => setTicket(null)} />}
        </PrintTicketContext.Provider>
    );
}

export function usePrintTicket(): PrintTicketContextType {
    const context = useContext(PrintTicketContext);
    if (!context) {
        throw new Error('usePrintTicket doit être utilisé dans PrintTicketProvider');
    }
    return context;
}
