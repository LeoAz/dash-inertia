import { useCallback, useEffect, useRef, useState } from 'react';
import { Head, router } from '@inertiajs/react';

export default function NoShopPage() {
    const [open, setOpen] = useState(true);
    const dialogRef = useRef<HTMLDivElement | null>(null);

    const handleClose = useCallback(() => {
        if (!open) {
            return;
        }
        setOpen(false);
        // Déconnecter immédiatement l'utilisateur
        router.post('/logout', undefined, {
            preserveScroll: true,
            onFinish: () => {
                // Rien: Fortify redirige après la déconnexion
            },
        });
    }, [open]);

    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                handleClose();
            }
        };

        document.addEventListener('keydown', onKeyDown);
        return () => document.removeEventListener('keydown', onKeyDown);
    }, [handleClose]);

    const onBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (e.target === e.currentTarget) {
            handleClose();
        }
    };

    return (
        <>
            <Head title="Aucune boutique" />
            {/* Plein écran, modal d'alerte */}
            <div
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
                onClick={onBackdropClick}
                aria-hidden={!open}
            >
                <div
                    ref={dialogRef}
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="no-shop-title"
                    aria-describedby="no-shop-desc"
                    className="mx-4 w-full max-w-md rounded-lg bg-white p-6 shadow-xl dark:bg-zinc-900"
                >
                    <div className="mb-4 flex items-start gap-3">
                        <div className="mt-1 inline-flex h-8 w-8 items-center justify-center rounded-full bg-red-100 text-red-600 dark:bg-red-500/15">
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 20 20"
                                fill="currentColor"
                                className="h-5 w-5"
                                aria-hidden="true"
                            >
                                <path
                                    fillRule="evenodd"
                                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-4a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 6zm0 8a1 1 0 100-2 1 1 0 000 2z"
                                    clipRule="evenodd"
                                />
                            </svg>
                        </div>
                        <div>
                            <h2 id="no-shop-title" className="text-lg font-semibold">
                                Accès indisponible
                            </h2>
                            <p id="no-shop-desc" className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
                                Votre compte n’est associé à aucune boutique. Veuillez contacter l’administrateur de l’application pour obtenir l’accès.
                            </p>
                        </div>
                    </div>
                    <div className="mt-6 flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={handleClose}
                            className="inline-flex items-center justify-center rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-600 focus:ring-offset-2 dark:focus:ring-offset-zinc-900"
                        >
                            Se déconnecter
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
}
