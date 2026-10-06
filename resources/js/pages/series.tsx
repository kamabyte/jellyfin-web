import { Head, Link } from '@inertiajs/react';
import { DetailHero } from '@/components/detail-hero';
import { EpisodeList } from '@/components/episode-list';
import { ItemActions } from '@/components/item-actions';
import { PosterCard } from '@/components/item-card';
import { MediaDetails } from '@/components/media-details';
import { PeopleShelf } from '@/components/people-shelf';
import { SHELF_POSTER, Shelf } from '@/components/shelf';
import { episodeLabel, plural } from '@/lib/format';
import { cn } from '@/lib/utils';
import items from '@/routes/items';
import type { Episode, Item, ItemDetail } from '@/types';

export default function SeriesPage({
    series,
    seasons,
    seasonId,
    episodes,
    nextUp,
    similar,
}: {
    series: ItemDetail;
    seasons: Item[];
    seasonId: string | null;
    episodes: Episode[];
    nextUp: Episode | null;
    similar: Item[];
}) {
    const playId = nextUp?.id ?? episodes[0]?.id ?? series.id;
    const playLabel = nextUp
        ? `${nextUp.progress ? 'Продолжить' : 'Смотреть'} ${episodeLabel(nextUp)}`
        : 'Смотреть';

    return (
        <>
            <Head title={series.name} />

            <DetailHero
                item={series}
                eyebrow={
                    series.childCount
                        ? plural(series.childCount, [
                              'сезон',
                              'сезона',
                              'сезонов',
                          ])
                        : undefined
                }
                actions={
                    <ItemActions
                        item={series}
                        playId={playId}
                        playLabel={playLabel}
                    />
                }
            />

            <div className="relative flex flex-col gap-12">
                <section className="px-4 md:px-8 lg:px-12">
                    {seasons.length > 1 && (
                        <div
                            role="tablist"
                            aria-label="Сезоны"
                            className="-mx-1 mb-5 scrollbar-none flex gap-2 overflow-x-auto px-1"
                        >
                            {seasons.map((season) => (
                                <Link
                                    key={season.id}
                                    role="tab"
                                    aria-selected={season.id === seasonId}
                                    href={items.show(series.id, {
                                        query: { season: season.id },
                                    })}
                                    only={['seasonId', 'episodes']}
                                    preserveScroll
                                    preserveState
                                    replace
                                    className={cn(
                                        'inline-flex h-10 shrink-0 items-center gap-2 rounded-full px-5 text-sm font-medium whitespace-nowrap transition-colors',
                                        season.id === seasonId
                                            ? 'bg-foreground text-background'
                                            : 'bg-white/[0.07] text-foreground/85 hover:bg-white/[0.12]',
                                    )}
                                >
                                    {season.name}
                                    {season.played && (
                                        <span aria-label="просмотрен">✓</span>
                                    )}
                                </Link>
                            ))}
                        </div>
                    )}
                    {seasons.length === 1 && (
                        <h2 className="mb-4 font-display text-xl font-semibold md:text-2xl">
                            {seasons[0].name}
                        </h2>
                    )}
                    <div className="max-w-5xl">
                        <EpisodeList
                            episodes={episodes}
                            currentId={nextUp?.id}
                        />
                    </div>
                </section>

                <PeopleShelf people={series.people} />

                {similar.length > 0 && (
                    <Shelf title="Похожие сериалы">
                        {similar.map((entry) => (
                            <PosterCard
                                key={entry.id}
                                item={entry}
                                className={SHELF_POSTER}
                            />
                        ))}
                    </Shelf>
                )}

                <MediaDetails item={series} />
            </div>
        </>
    );
}

SeriesPage.layout = { overlay: true };
