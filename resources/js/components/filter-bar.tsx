import { router } from '@inertiajs/react';
import { Eye, EyeOff } from 'lucide-react';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import type { Option } from '@/types';

export interface Filters {
    sort: string;
    unwatched?: boolean;
    genre?: string | null;
}

const ALL_GENRES = '__all';

/**
 * Сортировка и фильтры сетки. Меняют адрес (его можно отправить ссылкой) и
 * загружают сетку заново с первой страницы.
 */
export function FilterBar({
    filters,
    sorts,
    genres = [],
    withUnwatched = false,
}: {
    filters: Filters;
    sorts: Option[];
    genres?: string[];
    withUnwatched?: boolean;
}) {
    const apply = (patch: Partial<Filters>) => {
        const next = { ...filters, ...patch };
        router.get(
            window.location.pathname,
            {
                sort: next.sort,
                unwatched: next.unwatched ? 1 : undefined,
                genre: next.genre || undefined,
            },
            { preserveScroll: false, preserveState: false, replace: true },
        );
    };

    const trigger =
        'h-9 rounded-full border-white/10 bg-white/[0.07] px-4 text-[13px] font-medium hover:bg-white/[0.12]';

    return (
        <div className="flex flex-wrap items-center gap-2">
            <Select
                value={filters.sort}
                onValueChange={(sort) => apply({ sort })}
            >
                <SelectTrigger
                    className={cn(trigger, 'w-auto')}
                    aria-label="Сортировка"
                >
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    {sorts.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                            {option.label}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>

            {genres.length > 0 && (
                <Select
                    value={filters.genre ?? ALL_GENRES}
                    onValueChange={(genre) =>
                        apply({ genre: genre === ALL_GENRES ? null : genre })
                    }
                >
                    <SelectTrigger
                        className={cn(trigger, 'w-auto')}
                        aria-label="Жанр"
                    >
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="max-h-80">
                        <SelectItem value={ALL_GENRES}>Все жанры</SelectItem>
                        {genres.map((genre) => (
                            <SelectItem key={genre} value={genre}>
                                {genre}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            )}

            {withUnwatched && (
                <button
                    type="button"
                    aria-pressed={!!filters.unwatched}
                    onClick={() => apply({ unwatched: !filters.unwatched })}
                    className={cn(
                        'inline-flex h-9 items-center gap-2 rounded-full px-4 text-[13px] font-medium transition-colors',
                        filters.unwatched
                            ? 'bg-foreground text-background'
                            : 'bg-white/[0.07] text-foreground/85 hover:bg-white/[0.12]',
                    )}
                >
                    {filters.unwatched ? (
                        <EyeOff className="size-4" />
                    ) : (
                        <Eye className="size-4" />
                    )}
                    Непросмотренные
                </button>
            )}
        </div>
    );
}
