import { InfiniteScroll } from '@inertiajs/react';
import { LandscapeCard, PosterCard } from '@/components/item-card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import type { Item } from '@/types';

const POSTER_GRID =
    'grid grid-cols-[repeat(auto-fill,minmax(9rem,1fr))] gap-x-4 gap-y-7 md:grid-cols-[repeat(auto-fill,minmax(10.5rem,1fr))] md:gap-x-5';
const LANDSCAPE_GRID =
    'grid grid-cols-[repeat(auto-fill,minmax(16rem,1fr))] gap-x-4 gap-y-7 md:gap-x-5';

function Card({ item, landscape }: { item: Item; landscape: boolean }) {
    return landscape ? (
        <LandscapeCard item={item} play={!item.isFolder} />
    ) : (
        <PosterCard item={item} />
    );
}

/** Сетка без подгрузки — фильмография, результаты поиска. */
export function ItemGrid({
    items,
    landscape = false,
    className,
}: {
    items: Item[];
    landscape?: boolean;
    className?: string;
}) {
    return (
        <div
            className={cn(landscape ? LANDSCAPE_GRID : POSTER_GRID, className)}
        >
            {items.map((item) => (
                <Card key={item.id} item={item} landscape={landscape} />
            ))}
        </div>
    );
}

/** Сетка медиатеки или папки: следующие страницы — при прокрутке. */
export function ScrollGrid({
    prop,
    items,
    landscape = false,
}: {
    /** Имя пропа с Inertia::scroll на сервере. */
    prop: string;
    items: Item[];
    landscape?: boolean;
}) {
    return (
        <InfiniteScroll
            data={prop}
            buffer={1200}
            preserveUrl
            onlyNext
            className={landscape ? LANDSCAPE_GRID : POSTER_GRID}
            loading={() =>
                Array.from({ length: 6 }, (_, index) => (
                    <Skeleton
                        key={index}
                        className={cn(
                            'rounded-xl',
                            landscape ? 'aspect-video' : 'aspect-[2/3]',
                        )}
                    />
                ))
            }
        >
            {items.map((item) => (
                <Card key={item.id} item={item} landscape={landscape} />
            ))}
        </InfiniteScroll>
    );
}
