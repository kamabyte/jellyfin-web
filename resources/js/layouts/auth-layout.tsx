import type { ReactNode } from 'react';
import { LogoMark } from '@/components/logo';

/** Вход: карточка по центру на тёмном фоне с мягким свечением. */
export default function AuthLayout({ children }: { children: ReactNode }) {
    return (
        <div className="relative flex min-h-dvh items-center justify-center overflow-hidden px-4 py-12">
            <div
                aria-hidden
                className="pointer-events-none absolute -top-1/3 left-1/2 size-[60rem] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,oklch(0.55_0.2_300/0.35),transparent)] blur-2xl"
            />
            <div
                aria-hidden
                className="pointer-events-none absolute -right-1/4 -bottom-1/3 size-[50rem] rounded-full bg-[radial-gradient(closest-side,oklch(0.6_0.14_230/0.25),transparent)] blur-2xl"
            />
            <div className="relative w-full max-w-sm">
                <div className="mb-8 flex justify-center">
                    <LogoMark className="size-14 rounded-2xl [&_svg]:size-7" />
                </div>
                {children}
            </div>
        </div>
    );
}
