import { Head } from '@inertiajs/react';

import HeadingSmall from '@/components/heading-small';

import AppLayout from '@/layouts/app-layout';
import SettingsLayout from '@/layouts/settings/layout';

export default function Appearance() {
    return (
        <AppLayout>
            <Head title="Appearance settings" />

            <SettingsLayout>
                <div className="space-y-6">
                    <HeadingSmall
                        title="Appearance settings"
                        description="Le mode sombre est désactivé et les paramètres d'apparence ne sont plus disponibles."
                    />
                </div>
            </SettingsLayout>
        </AppLayout>
    );
}
