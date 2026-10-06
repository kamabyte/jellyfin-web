import { Head } from '@inertiajs/react';
import { DetailHero, SeriesEyebrow } from '@/components/detail-hero';
import { EpisodeList } from '@/components/episode-list';
import { ItemActions } from '@/components/item-actions';
import { PosterCard } from '@/components/item-card';
import { MediaDetails } from '@/components/media-details';
import { PeopleShelf } from '@/components/people-shelf';
import { SHELF_POSTER, Shelf } from '@/components/shelf';
import type { Episode, Item, ItemDetail } from '@/types';

/** Фильм, серия или просто видео. */
export default function ItemPage({
    item,
    episodes,
    similar,
}: {
    item: ItemDetail;
    episodes: Episode[];
    similar: Item[];
}) {
    const isEpisode = item.type === 'Episode';
    const title =
        isEpisode && item.seriesName
            ? `${item.name} — ${item.seriesName}`
            : item.name;

    return (
        <>
            <Head title={title} />

            <DetailHero
                item={item}
                poster={!isEpisode}
                eyebrow={isEpisode ? <SeriesEyebrow item={item} /> : undefined}
                actions={<ItemActions item={item} />}
            />

            <div className="relative flex flex-col gap-12">
                {episodes.length > 0 && (
                    <section className="px-4 md:px-8 lg:px-12">
                        <h2 className="mb-4 font-display text-xl font-semibold md:text-2xl">
                            {item.season !== null
                                ? `Сезон ${item.season}`
                                : 'Серии'}
                        </h2>
                        <div className="max-w-5xl">
                            <EpisodeList
                                episodes={episodes}
                                currentId={item.id}
                            />
                        </div>
                    </section>
                )}

                <PeopleShelf people={item.people} />

                {similar.length > 0 && (
                    <Shelf title="Похожее">
                        {similar.map((entry) => (
                            <PosterCard
                                key={entry.id}
                                item={entry}
                                className={SHELF_POSTER}
                            />
                        ))}
                    </Shelf>
                )}

                <MediaDetails item={item} />
            </div>
        </>
    );
}

ItemPage.layout = { overlay: true };
