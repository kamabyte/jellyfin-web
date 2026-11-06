import { Link, router } from '@inertiajs/react';
import { Check, ChevronRight, Play, RotateCcw, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Artwork } from '@/components/item-card';
import { getJson } from '@/lib/api';
import { formatRuntime } from '@/lib/format';
import { cn } from '@/lib/utils';
import { watch } from '@/routes';
import items from '@/routes/items';
import series from '@/routes/series';
import type { Episode, Item, ItemDetail } from '@/types';
import { ControlButton } from './control-button';

interface Season {
    seasons: Item[];
    seasonId: string | null;
    episodes: Episode[];
}

/**
 * Панель «Серии» справа в плеере: сезоны, серии выбранного сезона и
 * переход на страницу сериала. Как и настройки, рисуется внутри плеера —
 * портал Radix в полноэкранном режиме не виден. Списки грузятся при
 * открытии и запоминаются по сезонам.
 */
export function EpisodesPanel({
    item,
    onClose,
}: {
    item: ItemDetail;
    onClose: () => void;
}) {
    const ref = useRef<HTMLDivElement>(null);
    const list = useRef<HTMLOListElement>(null);
    const [seasons, setSeasons] = useState<Item[]>([]);
    const [seasonId, setSeasonId] = useState(item.seasonId);
    const [cache, setCache] = useState<Record<string, Episode[]>>({});
    const [failed, setFailed] = useState(false);
    const [attempt, setAttempt] = useState(0);
    const seriesId = item.seriesId!;
    const episodes = seasonId === null ? undefined : cache[seasonId];

    useEffect(() => {
        if (episodes) return;
        const controller = new AbortController();
        setFailed(false);
        getJson<Season>(
            series.episodes.url(seriesId, {
                query: seasonId ? { season: seasonId } : {},
            }),
            { signal: controller.signal },
        )
            .then((data) => {
                setSeasons(data.seasons);
                if (data.seasonId === null) return;
                setCache((current) => ({
                    ...current,
                    [data.seasonId!]: data.episodes,
                }));
                setSeasonId(data.seasonId);
            })
            .catch(() => {
                if (!controller.signal.aborted) setFailed(true);
            });
        return () => controller.abort();
    }, [seriesId, seasonId, episodes, attempt]);

    // Текущую серию — в середину списка; другой сезон — с начала.
    useEffect(() => {
        if (!episodes) return;
        const current = list.current?.querySelector('[aria-current="true"]');
        if (current) current.scrollIntoView({ block: 'center' });
        else list.current?.scrollTo({ top: 0 });
    }, [episodes]);

    useEffect(() => {
        const onDown = (event: PointerEvent) => {
            const target = event.target as HTMLElement;
            if (
                !ref.current?.contains(target) &&
                !target.closest('[data-episodes-toggle]')
            )
                onClose();
        };
        const onKey = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                event.stopPropagation();
                onClose();
            }
        };
        document.addEventListener('pointerdown', onDown);
        document.addEventListener('keydown', onKey, true);
        return () => {
            document.removeEventListener('pointerdown', onDown);
            document.removeEventListener('keydown', onKey, true);
        };
    }, [onClose]);

    const play = (episode: Episode) => {
        if (episode.id === item.id) onClose();
        // Как «следующая серия»: «Назад» из плеера — туда, откуда пришли.
        else router.visit(watch(episode.id), { replace: true });
    };

    return (
        <div
            ref={ref}
            role="dialog"
            aria-label="Серии"
            className="absolute inset-y-0 right-0 z-30 flex w-full animate-fade-in flex-col bg-black/85 text-white shadow-2xl backdrop-blur-md sm:w-[26rem]"
            onClick={(event) => event.stopPropagation()}
        >
            <div className="flex items-start gap-2 px-5 pt-5 pb-3">
                <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium tracking-wide text-white/50 uppercase">
                        Серии
                    </p>
                    <Link
                        href={items.show(seriesId)}
                        className="group/series mt-0.5 inline-flex max-w-full items-center gap-1 font-display text-lg font-semibold hover:text-white/80"
                    >
                        <span className="truncate">
                            {item.seriesName ?? 'Сериал'}
                        </span>
                        <ChevronRight className="size-5 shrink-0 text-white/50 transition-transform group-hover/series:translate-x-0.5" />
                    </Link>
                </div>
                <ControlButton label="Закрыть (Esc)" onClick={onClose}>
                    <X />
                </ControlButton>
            </div>

            {seasons.length > 1 && (
                <div
                    role="tablist"
                    aria-label="Сезоны"
                    className="scrollbar-none flex shrink-0 gap-2 overflow-x-auto px-5 pb-3"
                >
                    {seasons.map((season) => (
                        <button
                            key={season.id}
                            type="button"
                            role="tab"
                            aria-selected={season.id === seasonId}
                            onClick={() => setSeasonId(season.id)}
                            className={cn(
                                'inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full px-4 text-sm font-medium whitespace-nowrap transition-colors',
                                season.id === seasonId
                                    ? 'bg-white text-black'
                                    : 'bg-white/10 text-white/85 hover:bg-white/20',
                            )}
                        >
                            {season.name}
                            {season.played && (
                                <Check
                                    className="size-3.5"
                                    strokeWidth={3}
                                    aria-label="просмотрен"
                                />
                            )}
                        </button>
                    ))}
                </div>
            )}

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain border-t border-white/10 px-3 pt-2 pb-4">
                {failed ? (
                    <div className="flex flex-col items-center gap-3 px-6 py-12 text-center text-sm text-white/65">
                        Не удалось загрузить серии.
                        <button
                            type="button"
                            onClick={() => setAttempt((n) => n + 1)}
                            className="inline-flex h-9 items-center gap-2 rounded-full bg-white/15 px-4 font-semibold text-white hover:bg-white/25"
                        >
                            <RotateCcw className="size-4" />
                            Ещё раз
                        </button>
                    </div>
                ) : !episodes ? (
                    <div className="flex flex-col gap-1" aria-busy>
                        {Array.from({ length: 5 }, (_, index) => (
                            <div key={index} className="flex gap-3 p-2">
                                <div className="aspect-video w-32 shrink-0 animate-pulse rounded-lg bg-white/10" />
                                <div className="flex-1 space-y-2 py-1">
                                    <div className="h-4 w-4/5 animate-pulse rounded bg-white/10" />
                                    <div className="h-3 w-1/3 animate-pulse rounded bg-white/10" />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <ol ref={list} className="flex flex-col gap-1">
                        {episodes.map((episode) => {
                            const current = episode.id === item.id;

                            return (
                                <li key={episode.id}>
                                    <button
                                        type="button"
                                        aria-current={current}
                                        onClick={() => play(episode)}
                                        className={cn(
                                            'group flex w-full gap-3 rounded-xl p-2 text-left transition-colors hover:bg-white/10',
                                            current &&
                                                'bg-white/12 ring-1 ring-white/20',
                                        )}
                                    >
                                        <div className="relative w-32 shrink-0 overflow-hidden rounded-lg ring-1 ring-white/10">
                                            <Artwork
                                                src={
                                                    episode.landscape ??
                                                    episode.poster
                                                }
                                                item={episode}
                                                className="aspect-video"
                                            />
                                            <div
                                                className={cn(
                                                    'absolute inset-0 flex items-center justify-center transition',
                                                    current
                                                        ? 'bg-black/45'
                                                        : 'bg-black/0 group-hover:bg-black/35',
                                                )}
                                            >
                                                <Play
                                                    className={cn(
                                                        'size-6 fill-white text-white drop-shadow-lg transition',
                                                        !current &&
                                                            'opacity-0 group-hover:opacity-100',
                                                    )}
                                                />
                                            </div>
                                            {episode.progress !== null && (
                                                <div className="absolute inset-x-0 bottom-0 h-1 bg-white/25">
                                                    <div
                                                        className="h-full bg-brand"
                                                        style={{
                                                            width: `${episode.progress}%`,
                                                        }}
                                                    />
                                                </div>
                                            )}
                                        </div>
                                        <div className="min-w-0 flex-1 py-0.5">
                                            <div className="flex items-start gap-1.5">
                                                <p className="line-clamp-2 flex-1 text-sm font-medium">
                                                    {episode.episode !==
                                                        null && (
                                                        <span className="mr-1 text-white/55 tabular-nums">
                                                            {episode.episode}.
                                                        </span>
                                                    )}
                                                    {episode.name}
                                                </p>
                                                {episode.played && (
                                                    <Check
                                                        className="mt-0.5 size-4 shrink-0 text-brand"
                                                        strokeWidth={3}
                                                        aria-label="Просмотрено"
                                                    />
                                                )}
                                            </div>
                                            <p className="mt-1 text-xs text-white/55">
                                                {current
                                                    ? 'Сейчас'
                                                    : formatRuntime(
                                                          episode.runtime,
                                                      )}
                                            </p>
                                        </div>
                                    </button>
                                </li>
                            );
                        })}
                    </ol>
                )}
            </div>
        </div>
    );
}
