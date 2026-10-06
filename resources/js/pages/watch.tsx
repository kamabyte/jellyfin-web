import { Head, router } from '@inertiajs/react';
import { Player } from '@/components/player';
import items from '@/routes/items';
import type { Episode, ItemDetail, Segment, Trickplay } from '@/types';

export default function Watch({
    item,
    startAt,
    next,
    segments,
    trickplay,
}: {
    item: ItemDetail;
    startAt: number;
    next: Episode | null;
    segments: Segment[];
    trickplay: Trickplay | null;
}) {
    const title =
        item.type === 'Episode' && item.seriesName
            ? `${item.seriesName} — ${item.name}`
            : item.name;

    // Назад — туда, откуда пришли; если плеер открыли по ссылке — на
    // страницу фильма или сериала.
    const back = () => {
        if (window.history.length > 1) window.history.back();
        else router.visit(items.show(item.seriesId ?? item.id));
    };

    return (
        <>
            <Head title={title} />
            <Player
                key={item.id}
                item={item}
                startAt={startAt}
                next={next}
                segments={segments}
                trickplay={trickplay}
                onBack={back}
            />
        </>
    );
}
