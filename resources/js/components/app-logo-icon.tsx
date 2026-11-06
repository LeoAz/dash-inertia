import { cn } from '@/lib/utils';
import { ImgHTMLAttributes } from 'react';

export default function AppLogoIcon(props: ImgHTMLAttributes<HTMLImageElement>) {
    return (
        <img
            src="/img/logo%201.png"
            alt={props.alt ?? 'Logo'}
            {...props}
            className={cn('mix-blend-multiply dark:mix-blend-screen dark:invert', props.className)}
        />
    );
}
