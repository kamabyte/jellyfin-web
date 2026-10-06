import { Star } from 'lucide-react';
import { formatRuntime, yearRange } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { ItemDetail, MediaInfo } from '@/types';

/** Строка «2019 · ★ 7.8 · 16+ · 2 ч 15 мин · драма, триллер». */
export function ItemMeta({
    item,
    genres = 3,
    className,
}: {
    item: ItemDetail;
    genres?: number;
    className?: string;
}) {
    const parts = [
        yearRange(item, item.status),
        item.officialRating,
        item.type === 'Series' ? null : formatRuntime(item.runtime),
        item.genres.slice(0, genres).join(', ').toLowerCase(),
    ].filter(Boolean);

    return (
        <div
            className={cn(
                'flex flex-wrap items-center gap-x-2.5 gap-y-1 text-sm text-white/80',
                className,
            )}
        >
            {item.rating !== null && (
                <span className="inline-flex items-center gap-1 font-semibold text-white">
                    <Star className="size-3.5 fill-amber-400 text-amber-400" />
                    {item.rating.toFixed(1)}
                </span>
            )}
            {parts.map((part, index) => (
                <span key={index} className="inline-flex items-center gap-2.5">
                    {(index > 0 || item.rating !== null) && (
                        <span className="text-white/40" aria-hidden>
                            ·
                        </span>
                    )}
                    {part}
                </span>
            ))}
        </div>
    );
}

/** Значки качества: 4K, HDR, звук. */
export function MediaBadges({
    media,
    className,
}: {
    media: MediaInfo | null;
    className?: string;
}) {
    if (!media) return null;

    const badges = [media.resolution, media.hdr, media.videoCodec].filter(
        (badge): badge is string => !!badge,
    );

    return (
        <div className={cn('flex flex-wrap gap-1.5', className)}>
            {badges.map((badge) => (
                <span
                    key={badge}
                    className="rounded-md border border-white/25 px-1.5 py-0.5 text-[11px] leading-none font-semibold tracking-wide text-white/85"
                >
                    {badge}
                </span>
            ))}
        </div>
    );
}
