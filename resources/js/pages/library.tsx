import { Head } from '@inertiajs/react';
import { FilterBar, type Filters } from '@/components/filter-bar';
import { prefersLandscape } from '@/components/item-card';
import { ScrollGrid } from '@/components/item-grid';
import { libraryIcon } from '@/components/library-icon';
import { EmptyState } from '@/components/empty-state';
import type { Item, Library, Option, Paginated } from '@/types';

export default function LibraryPage({
    library,
    items,
    filters,
    sorts,
    genres,
}: {
    library: Library;
    items: Paginated<Item>;
    filters: Filters;
    sorts: Option[];
    genres: string[];
}) {
    const Icon = libraryIcon(library);
    const filtered = !!filters.unwatched || !!filters.genre;

    return (
        <>
            <Head title={library.name} />

            <div className="px-4 md:px-8 lg:px-12">
                <div className="mb-6 flex flex-col gap-4 md:mb-8 md:flex-row md:items-end md:justify-between">
                    <h1 className="flex items-center gap-3 font-display text-3xl font-bold md:text-4xl">
                        <Icon className="size-7 text-brand md:size-8" />
                        {library.name}
                    </h1>
                    <FilterBar
                        filters={filters}
                        sorts={sorts}
                        genres={genres}
                        withUnwatched={library.kind !== 'folders'}
                    />
                </div>

                {items.data.length === 0 ? (
                    <EmptyState
                        title={
                            filtered ? 'Ничего не нашлось' : 'Здесь пока пусто'
                        }
                        description={
                            filtered
                                ? 'Попробуйте снять фильтры.'
                                : 'Когда в медиатеку добавят файлы, они появятся здесь.'
                        }
                    />
                ) : (
                    <ScrollGrid
                        prop="items"
                        items={items.data}
                        landscape={
                            library.kind === 'folders' &&
                            prefersLandscape(items.data)
                        }
                    />
                )}
            </div>
        </>
    );
}
