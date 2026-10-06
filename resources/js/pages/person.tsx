import { Head } from '@inertiajs/react';
import { useState } from 'react';
import { Artwork } from '@/components/item-card';
import { ItemGrid } from '@/components/item-grid';
import { EmptyState } from '@/components/empty-state';
import { formatDate } from '@/lib/format';
import type { Item, ItemDetail } from '@/types';

export default function PersonPage({
    person,
    items,
}: {
    person: ItemDetail;
    items: Item[];
}) {
    const [expanded, setExpanded] = useState(false);

    return (
        <>
            <Head title={person.name} />

            <div className="px-4 md:px-8 lg:px-12">
                <div className="mb-10 flex flex-col gap-6 sm:flex-row sm:items-end">
                    <Artwork
                        src={person.poster}
                        item={person}
                        className="aspect-[2/3] w-40 shrink-0 rounded-2xl shadow-2xl ring-1 shadow-black/50 ring-white/10 md:w-48"
                    />
                    <div className="min-w-0">
                        <h1 className="mb-2 font-display text-3xl font-bold md:text-5xl">
                            {person.name}
                        </h1>
                        {person.premiereDate && (
                            <p className="mb-3 text-sm text-muted-foreground">
                                Родился(-ась) {formatDate(person.premiereDate)}
                            </p>
                        )}
                        {person.overview && (
                            <button
                                type="button"
                                onClick={() => setExpanded(!expanded)}
                                className="max-w-3xl text-left text-sm leading-relaxed text-white/75"
                            >
                                <span
                                    className={expanded ? '' : 'line-clamp-4'}
                                >
                                    {person.overview}
                                </span>
                            </button>
                        )}
                    </div>
                </div>

                <h2 className="mb-5 font-display text-xl font-semibold md:text-2xl">
                    Фильмы и сериалы
                </h2>
                {items.length === 0 ? (
                    <EmptyState title="В медиатеке ничего нет" />
                ) : (
                    <ItemGrid items={items} />
                )}
            </div>
        </>
    );
}
