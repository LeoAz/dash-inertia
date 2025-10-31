import { SidebarInset } from '@/components/ui/sidebar';
import * as React from 'react';

interface AppContentProps extends React.ComponentProps<'main'> {
    variant?: 'header' | 'sidebar';
    fullWidth?: boolean;
}

export function AppContent({
    variant = 'header',
    fullWidth = false,
    children,
    className,
    ...props
}: AppContentProps) {
    if (variant === 'sidebar') {
        return <SidebarInset {...props}>{children}</SidebarInset>;
    }

    const base = 'flex h-full w-full flex-1 flex-col gap-4';
    const width = fullWidth ? 'max-w-none' : 'mx-auto max-w-7xl';
    const radius = fullWidth ? '' : 'rounded-xl';

    return (
        <main
            className={[base, width, radius, className].filter(Boolean).join(' ')}
            {...props}
        >
            {children}
        </main>
    );
}
