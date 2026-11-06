import { SidebarInset } from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';
import * as React from 'react';

interface AppContentProps extends React.ComponentProps<'main'> {
    variant?: 'header' | 'sidebar';
}

export function AppContent({
    variant = 'header',
    children,
    className,
    ...props
}: AppContentProps) {
    if (variant === 'sidebar') {
        return <SidebarInset {...props}>{children}</SidebarInset>;
    }

    return (
        <main
            className={cn('mx-auto flex w-full max-w-screen-2xl flex-1 flex-col gap-4 px-4 py-4 md:px-6 md:py-5 lg:px-8', className)}
            {...props}
        >
            {children}
        </main>
    );
}
