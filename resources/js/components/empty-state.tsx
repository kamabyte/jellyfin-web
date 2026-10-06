import { Popcorn } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export function EmptyState({
    title,
    description,
    icon,
    className,
    children,
}: {
    title: string;
    description?: string;
    icon?: ReactNode;
    className?: string;
    children?: ReactNode;
}) {
    return (
        <div
            className={cn(
                'flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-white/10 px-6 py-20 text-center',
                className,
            )}
        >
            <div className="flex size-14 items-center justify-center rounded-2xl bg-white/[0.06] text-muted-foreground [&_svg]:size-7">
                {icon ?? <Popcorn />}
            </div>
            <h2 className="text-lg font-semibold">{title}</h2>
            {description && (
                <p className="max-w-sm text-sm text-muted-foreground">
                    {description}
                </p>
            )}
            {children}
        </div>
    );
}
