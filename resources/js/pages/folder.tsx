import { Head } from '@inertiajs/react';
import { FolderOpen } from 'lucide-react';
import { EmptyState } from '@/components/empty-state';
import { FilterBar } from '@/components/filter-bar';
import { prefersLandscape } from '@/components/item-card';
import { ScrollGrid } from '@/components/item-grid';
import type { Item, ItemDetail, Option, Paginated } from '@/types';

/** Папка «прочего видео» (курс, сезон спорта) или коллекция фильмов. */
export default function FolderPage({
    folder,
    items,
    sort,
    sorts,
}: {
    folder: ItemDetail;
    items: Paginated<Item>;
    sort: string;
    sorts: Option[];
}) {
    return (
        <>
            <Head title={folder.name} />

            <div className="px-4 md:px-8 lg:px-12">
                <div className="mb-6 flex flex-col gap-4 md:mb-8 md:flex-row md:items-end md:justify-between">
                    <div className="min-w-0">
                        <h1 className="flex items-center gap-3 font-display text-3xl font-bold md:text-4xl">
                            <FolderOpen className="size-7 shrink-0 text-brand md:size-8" />
                            <span className="truncate">{folder.name}</span>
                        </h1>
                        {folder.overview && (
                            <p className="mt-3 max-w-3xl text-sm text-muted-foreground">
                                {folder.overview}
                            </p>
                        )}
                    </div>
                    <FilterBar filters={{ sort }} sorts={sorts} />
                </div>

                {items.data.length === 0 ? (
                    <EmptyState title="Папка пуста" />
                ) : (
                    <ScrollGrid
                        prop="items"
                        items={items.data}
                        landscape={prefersLandscape(items.data)}
                    />
                )}
            </div>
        </>
    );
}
