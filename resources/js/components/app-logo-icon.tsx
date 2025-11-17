import { ImgHTMLAttributes } from 'react';

export default function AppLogoIcon(props: ImgHTMLAttributes<HTMLImageElement>) {
    return (
        <img
            src="/img/logo%201.png"
            alt={props.alt ?? 'Logo'}
            {...props}
        />
    );
}
