import { Head } from '@inertiajs/react';
import { SearchIcon } from 'lucide-react';
import { EmptyState } from '@/components/empty-state';
import { ItemGrid } from '@/components/item-grid';
import { SearchBox } from '@/components/search-box';
import type { Item } from '@/types';

function Group({
    title,
    items,
    landscape = false,
}: {
    title: string;
    items: Item[];
    landscape?: boolean;
}) {
    if (items.length === 0) return null;

    return (
        <section>
            <h2 className="mb-4 font-display text-xl font-semibold md:text-2xl">
                {title}
            </h2>
            <ItemGrid items={items} landscape={landscape} />
        </section>
    );
}

export default function Search({
    query,
    titles,
    videos,
    people,
}: {
    query: string;
    titles: Item[];
    videos: Item[];
    people: Item[];
}) {
    const empty = titles.length + videos.length + people.length === 0;

    return (
        <>
            <Head title={query ? `«${query}»` : 'Поиск'} />

            <div className="px-4 md:px-8 lg:px-12">
                <SearchBox className="mb-8 md:hidden" autoFocus={!query} />

                {query === '' ? (
                    <EmptyState
                        icon={<SearchIcon />}
                        title="Что будем смотреть?"
                        description="Ищите фильмы, сериалы, серии и актёров. Клавиша «/» — быстрый переход к поиску."
                    />
                ) : empty ? (
                    <EmptyState
                        icon={<SearchIcon />}
                        title="Ничего не нашлось"
                        description={`По запросу «${query}» в медиатеке ничего нет.`}
                    />
                ) : (
                    <div className="flex flex-col gap-12">
                        <Group title="Фильмы и сериалы" items={titles} />
                        <Group title="Серии и видео" items={videos} landscape />
                        <Group title="Люди" items={people} />
                    </div>
                )}
            </div>
        </>
    );
}
