import { useCallback, useState } from 'react';

export type Appearance = 'light' | 'dark' | 'system';

const setCookie = (name: string, value: string, days = 365) => {
    if (typeof document === 'undefined') {
        return;
    }

    const maxAge = days * 24 * 60 * 60;
    document.cookie = `${name}=${value};path=/;max-age=${maxAge};SameSite=Lax`;
};

// Dark mode is globally disabled. Always force light mode on the document.
const applyLightTheme = () => {
    if (typeof document === 'undefined') {
        return;
    }

    document.documentElement.classList.remove('dark');
    document.documentElement.style.colorScheme = 'light';
};

export function initializeTheme(): void {
    // Persisted value is ignored; we always force light.
    localStorage.setItem('appearance', 'light');
    setCookie('appearance', 'light');
    applyLightTheme();
}

export function useAppearance() {
    const [appearance, setAppearance] = useState<Appearance>('light');

    const updateAppearance = useCallback((mode: Appearance) => {
        // Mark param as used to satisfy linting, but ignore its value.
        void mode;
        // Ignore requested mode and force light everywhere.
        setAppearance('light');
        localStorage.setItem('appearance', 'light');
        setCookie('appearance', 'light');
        applyLightTheme();
    }, []);

    // Dark mode is disabled; no need to update on mount beyond initializeTheme().

    return { appearance, updateAppearance } as const;
}
