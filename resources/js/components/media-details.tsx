import { formatBytes } from '@/lib/format';
import type { ItemDetail } from '@/types';

/** «О файле» и прочие сведения внизу страницы. */
export function MediaDetails({ item }: { item: ItemDetail }) {
    const media = item.media;
    const rows = [
        ['Жанры', item.genres.join(', ')],
        ['Студии', item.studios.join(', ')],
        [
            'Видео',
            media &&
                [media.resolution, media.videoCodec, media.hdr]
                    .filter(Boolean)
                    .join(' · '),
        ],
        [
            'Звук',
            media?.audio &&
                (media.audioTracks > 1
                    ? `${media.audio} и ещё ${media.audioTracks - 1}`
                    : media.audio),
        ],
        [
            'Субтитры',
            media && media.subtitles > 0 ? String(media.subtitles) : null,
        ],
        [
            'Файл',
            media &&
                [media.container?.toUpperCase(), formatBytes(media.size)]
                    .filter(Boolean)
                    .join(' · '),
        ],
    ].filter((row): row is [string, string] => !!row[1]);

    if (rows.length === 0) return null;

    return (
        <section className="px-4 md:px-8 lg:px-12">
            <h2 className="mb-4 font-display text-xl font-semibold md:text-2xl">
                Подробности
            </h2>
            <dl className="grid max-w-4xl grid-cols-[auto_1fr] gap-x-8 gap-y-2.5 text-sm">
                {rows.map(([label, value]) => (
                    <div key={label} className="contents">
                        <dt className="text-muted-foreground">{label}</dt>
                        <dd>{value}</dd>
                    </div>
                ))}
            </dl>
        </section>
    );
}
