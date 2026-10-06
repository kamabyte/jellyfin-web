import { Link } from '@inertiajs/react';
import type { ReactNode } from 'react';
import { Artwork } from '@/components/item-card';
import { ItemMeta, MediaBadges } from '@/components/item-meta';
import { cn } from '@/lib/utils';
import type { ItemDetail } from '@/types';
import items from '@/routes/items';

/**
 * Шапка страницы фильма или сериала: фон во всю ширину, постер слева,
 * название (логотипом, если есть), сведения и кнопки.
 */
export function DetailHero({
    item,
    eyebrow,
    actions,
    poster = true,
}: {
    item: ItemDetail;
    /** Над названием: сериал и номер серии. */
    eyebrow?: ReactNode;
    actions: ReactNode;
    poster?: boolean;
}) {
    return (
        <section className="relative">
            <div className="absolute inset-x-0 top-0 h-[85svh] max-h-[52rem] overflow-hidden">
                {item.backdrop && (
                    <img
                        src={item.backdrop}
                        alt=""
                        className="size-full animate-ken-burns object-cover object-[center_20%]"
                        fetchPriority="high"
                    />
                )}
                <div className="absolute inset-0 bg-linear-to-t from-background via-background/60 to-background/10" />
                <div className="absolute inset-0 bg-linear-to-r from-background/95 via-background/50 to-transparent" />
            </div>

            <div className="relative flex min-h-[70svh] items-end px-4 pt-28 pb-10 md:px-8 md:pt-40 lg:px-12">
                <div className="flex w-full items-end gap-10">
                    {poster && (
                        <Artwork
                            src={item.poster}
                            item={item}
                            className="hidden aspect-[2/3] w-60 shrink-0 rounded-2xl shadow-2xl ring-1 shadow-black/60 ring-white/10 lg:block xl:w-72"
                        />
                    )}
                    <div className="max-w-3xl min-w-0 animate-fade-in">
                        {eyebrow && (
                            <div className="mb-3 text-sm font-medium text-white/75">
                                {eyebrow}
                            </div>
                        )}
                        {item.logo && item.type !== 'Episode' ? (
                            <img
                                src={item.logo}
                                alt={item.name}
                                className="mb-5 max-h-32 max-w-[min(85%,28rem)] object-contain object-left drop-shadow-2xl"
                            />
                        ) : (
                            <h1 className="mb-4 font-display text-4xl font-bold text-balance md:text-5xl">
                                {item.name}
                            </h1>
                        )}
                        {item.tagline && (
                            <p className="mb-3 text-lg text-white/70 italic">
                                {item.tagline}
                            </p>
                        )}
                        <div className="mb-5 flex flex-wrap items-center gap-3">
                            <ItemMeta item={item} />
                            <MediaBadges media={item.media} />
                        </div>
                        {item.overview && (
                            <p className="mb-7 max-w-2xl text-[15px] leading-relaxed text-white/85 md:text-base">
                                {item.overview}
                            </p>
                        )}
                        {actions}
                    </div>
                </div>
            </div>
        </section>
    );
}

/** Ссылка «сериал» над названием серии. */
export function SeriesEyebrow({
    item,
    className,
}: {
    item: ItemDetail;
    className?: string;
}) {
    if (!item.seriesId) return null;

    return (
        <span className={cn('inline-flex flex-wrap gap-x-2', className)}>
            <Link
                href={items.show(item.seriesId)}
                className="font-semibold text-white hover:underline"
            >
                {item.seriesName}
            </Link>
            {item.season !== null && (
                <span>
                    Сезон {item.season}
                    {item.episode !== null && `, серия ${item.episode}`}
                </span>
            )}
        </span>
    );
}
