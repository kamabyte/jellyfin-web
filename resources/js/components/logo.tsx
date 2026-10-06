import { usePage } from '@inertiajs/react';
import { cn } from '@/lib/utils';

export function LogoMark({ className }: { className?: string }) {
    return (
        <span
            className={cn(
                'inline-flex size-8 items-center justify-center rounded-[10px] bg-linear-to-br from-[#aa5cc3] to-[#00a4dc] shadow-sm shadow-violet-950/40',
                className,
            )}
            aria-hidden
        >
            <svg
                viewBox="0 0 24 24"
                className="size-4 translate-x-px fill-white"
            >
                <path d="M8 5.14v13.72a1 1 0 0 0 1.5.86l11.04-6.86a1 1 0 0 0 0-1.72L9.5 4.28A1 1 0 0 0 8 5.14Z" />
            </svg>
        </span>
    );
}

export function Logo({ className }: { className?: string }) {
    const { name } = usePage().props;

    return (
        <span className={cn('inline-flex items-center gap-2.5', className)}>
            <LogoMark />
            <span className="font-display text-[19px] font-semibold tracking-tight">
                {name}
            </span>
        </span>
    );
}
