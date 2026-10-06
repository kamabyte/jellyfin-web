import { createInertiaApp } from '@inertiajs/react';
import { FlashToaster } from '@/components/flash-toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import AppLayout from '@/layouts/app-layout';
import AuthLayout from '@/layouts/auth-layout';

void createInertiaApp({
    title: (title) => {
        const app = import.meta.env.VITE_APP_NAME || 'Кинотека';
        return title ? `${title} · ${app}` : app;
    },
    layout: (name) => {
        switch (true) {
            case name.startsWith('auth/'):
                return AuthLayout;
            // Плеер — во весь экран, без шапки.
            case name === 'watch':
                return null;
            default:
                return AppLayout;
        }
    },
    strictMode: true,
    withApp(app) {
        return (
            <TooltipProvider delayDuration={300}>
                {app}
                <FlashToaster />
            </TooltipProvider>
        );
    },
    progress: {
        color: '#b57edc',
        delay: 150,
    },
});
