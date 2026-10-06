import { Deferred, Head } from '@inertiajs/react';
import { Hero } from '@/components/hero';
import {
    LandscapeCard,
    PosterCard,
    prefersLandscape,
} from '@/components/item-card';
import { SHELF_LANDSCAPE, SHELF_POSTER, Shelf } from '@/components/shelf';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import libraries from '@/routes/libraries';
import type { Item, ItemDetail, Library } from '@/types';

function ShelfSkeleton() {
    return (
        <div className="px-4 md:px-8 lg:px-12">
            <Skeleton className="mb-3 h-7 w-48" />
            <div className="flex gap-4 overflow-hidden">
                {Array.from({ length: 8 }, (_, index) => (
                    <Skeleton
                        key={index}
                        className="aspect-[2/3] w-[38vw] shrink-0 rounded-xl sm:w-44 lg:w-48"
                    />
                ))}
            </div>
        </div>
    );
}

export default function Home({
    hero,
    resume,
    nextUp,
    shelves,
}: {
    hero: ItemDetail[];
    resume: Item[];
    nextUp: Item[];
    shelves?: { library: Library; items: Item[] }[];
}) {
    return (
        <>
            <Head title="Главная" />

            {hero.length > 0 ? (
                <Hero slides={hero} />
            ) : (
                <div className="h-24" />
            )}

            <div
                className={cn(
                    'relative flex flex-col gap-10 md:gap-12',
                    hero.length > 0 && '-mt-6 md:-mt-10',
                )}
            >
                {resume.length > 0 && (
                    <Shelf title="Продолжить просмотр">
                        {resume.map((item) => (
                            <LandscapeCard
                                key={item.id}
                                item={item}
                                play
                                className={SHELF_LANDSCAPE}
                            />
                        ))}
                    </Shelf>
                )}

                {nextUp.length > 0 && (
                    <Shelf title="Следующие серии">
                        {nextUp.map((item) => (
                            <LandscapeCard
                                key={item.id}
                                item={item}
                                play
                                className={SHELF_LANDSCAPE}
                            />
                        ))}
                    </Shelf>
                )}

                <Deferred
                    data="shelves"
                    fallback={
                        <>
                            <ShelfSkeleton />
                            <ShelfSkeleton />
                        </>
                    }
                >
                    {(shelves ?? []).map(({ library, items }) => {
                        const landscape = prefersLandscape(items);

                        return (
                            <Shelf
                                key={library.id}
                                title={`Новое: ${library.name}`}
                                href={libraries.show(library.id)}
                            >
                                {items.map((item) =>
                                    landscape ? (
                                        <LandscapeCard
                                            key={item.id}
                                            item={item}
                                            className={SHELF_LANDSCAPE}
                                        />
                                    ) : (
                                        <PosterCard
                                            key={item.id}
                                            item={item}
                                            className={SHELF_POSTER}
                                        />
                                    ),
                                )}
                            </Shelf>
                        );
                    })}
                </Deferred>
            </div>
        </>
    );
}

Home.layout = { overlay: true };
