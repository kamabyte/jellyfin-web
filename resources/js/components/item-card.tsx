import { Link } from '@inertiajs/react';
import { Check, Film, Folder, Play, User } from 'lucide-react';
import { useState } from 'react';
import { episodeLabel, formatRemaining, yearRange } from '@/lib/format';
import { cn } from '@/lib/utils';
import { watch } from '@/routes';
import items from '@/routes/items';
import type { Item } from '@/types';

/** Картинка с заглушкой, пока грузится и если её нет. */
export function Artwork({
    src,
    item,
    className,
}: {
    src: string | null;
    item: Pick<Item, 'type' | 'isFolder' | 'name'>;
    className?: string;
}) {
    const [loaded, setLoaded] = useState(false);
    const [failed, setFailed] = useState(false);
    const Icon = item.type === 'Person' ? User : item.isFolder ? Folder : Film;

    return (
        <div
            className={cn(
                'relative overflow-hidden bg-linear-to-br from-white/[0.07] to-white/[0.02]',
                className,
            )}
        >
            {(!src || failed) && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-3 text-center text-muted-foreground">
                    <Icon className="size-8 opacity-50" strokeWidth={1.5} />
                    <span className="line-clamp-3 text-xs font-medium">
                        {item.name}
                    </span>
                </div>
            )}
            {src && !failed && (
                <img
                    src={src}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    onLoad={() => setLoaded(true)}
                    onError={() => setFailed(true)}
                    className={cn(
                        'absolute inset-0 size-full object-cover transition-opacity duration-500',
                        loaded ? 'opacity-100' : 'opacity-0',
                    )}
                />
            )}
        </div>
    );
}

function ProgressLine({ progress }: { progress: number | null }) {
    if (progress === null) return null;

    return (
        <div className="absolute inset-x-2 bottom-2 h-1 overflow-hidden rounded-full bg-white/25 backdrop-blur">
            <div
                className="h-full rounded-full bg-brand"
                style={{ width: `${Math.max(progress, 3)}%` }}
            />
        </div>
    );
}

function Badges({ item }: { item: Item }) {
    if (item.played) {
        return (
            <span
                className="absolute top-2 right-2 flex size-6 items-center justify-center rounded-full bg-brand text-brand-foreground shadow-md"
                aria-label="Просмотрено"
            >
                <Check className="size-3.5" strokeWidth={3} />
            </span>
        );
    }

    if (item.unplayed) {
        return (
            <span className="absolute top-2 right-2 min-w-6 rounded-full bg-brand px-1.5 py-0.5 text-center text-xs font-semibold text-brand-foreground tabular-nums shadow-md">
                {item.unplayed}
            </span>
        );
    }

    return null;
}

/** Куда ведёт карточка: «продолжить» — сразу в плеер, остальное — на страницу. */
export function itemHref(item: Item, play = false) {
    return play && !item.isFolder ? watch(item.id) : items.show(item.id);
}

function subtitle(item: Item): string {
    if (item.type === 'Episode') {
        return [item.seriesName, episodeLabel(item)]
            .filter(Boolean)
            .join(' · ');
    }

    if (item.type === 'Person') return '';

    return yearRange(item);
}

/** Постер 2:3 — фильмы, сериалы, люди, коллекции. */
export function PosterCard({
    item,
    className,
}: {
    item: Item;
    className?: string;
}) {
    return (
        <Link
            href={itemHref(item)}
            prefetch
            className={cn('group block outline-none', className)}
        >
            <div className="relative overflow-hidden rounded-xl shadow-lg ring-1 shadow-black/30 ring-white/10 transition duration-300 group-hover:-translate-y-1 group-hover:shadow-xl group-hover:ring-white/30 group-focus-visible:ring-2 group-focus-visible:ring-ring">
                <Artwork
                    src={item.poster}
                    item={item}
                    className={cn(
                        'aspect-[2/3]',
                        item.type === 'Person' && 'aspect-square',
                    )}
                />
                <Badges item={item} />
                <ProgressLine progress={item.progress} />
            </div>
            <div className="mt-2.5 px-0.5">
                <div className="truncate text-sm font-medium">{item.name}</div>
                <div className="truncate text-xs text-muted-foreground">
                    {subtitle(item) || ' '}
                </div>
            </div>
        </Link>
    );
}

/**
 * Горизонтальная карточка 16:9: «Продолжить просмотр», серии, видео из
 * папок. С play — по клику сразу плеер.
 */
export function LandscapeCard({
    item,
    play = false,
    className,
}: {
    item: Item;
    play?: boolean;
    className?: string;
}) {
    const title =
        item.type === 'Episode' && item.seriesName
            ? item.seriesName
            : item.name;
    const caption =
        item.type === 'Episode'
            ? [episodeLabel(item), item.name].filter(Boolean).join(' · ')
            : formatRemaining(item) || yearRange(item);

    return (
        <Link
            href={itemHref(item, play)}
            prefetch={!play}
            className={cn('group block outline-none', className)}
        >
            <div className="relative overflow-hidden rounded-xl shadow-lg ring-1 shadow-black/30 ring-white/10 transition duration-300 group-hover:-translate-y-1 group-hover:shadow-xl group-hover:ring-white/30 group-focus-visible:ring-2 group-focus-visible:ring-ring">
                <Artwork
                    src={item.landscape ?? item.poster}
                    item={item}
                    className="aspect-video"
                />
                {play && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition group-hover:bg-black/30">
                        <span className="flex size-12 scale-90 items-center justify-center rounded-full bg-white/90 text-black opacity-0 shadow-lg transition group-hover:scale-100 group-hover:opacity-100">
                            <Play className="ml-0.5 size-5 fill-current" />
                        </span>
                    </div>
                )}
                <Badges item={item} />
                <ProgressLine progress={item.progress} />
            </div>
            <div className="mt-2.5 px-0.5">
                <div className="truncate text-sm font-medium">{title}</div>
                <div className="truncate text-xs text-muted-foreground">
                    {caption || ' '}
                </div>
            </div>
        </Link>
    );
}

/** Горизонтальные карточки, если у большинства картинки не постерные. */
export function prefersLandscape(list: Item[]): boolean {
    const wide = list.filter(
        (item) =>
            (item.aspect !== null && item.aspect > 1.2) ||
            (!item.poster && item.landscape),
    ).length;

    return list.length > 0 && wide > list.length / 2;
}
