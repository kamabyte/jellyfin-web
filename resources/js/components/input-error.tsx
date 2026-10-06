import { cn } from '@/lib/utils';

export function InputError({
    message,
    className,
}: {
    message?: string;
    className?: string;
}) {
    return message ? (
        <p className={cn('text-sm text-red-400', className)}>{message}</p>
    ) : null;
}
