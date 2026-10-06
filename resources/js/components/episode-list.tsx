import { Link } from '@inertiajs/react';
import { Check, Play } from 'lucide-react';
import { Artwork } from '@/components/item-card';
import { formatDate, formatRuntime } from '@/lib/format';
import { cn } from '@/lib/utils';
import { watch } from '@/routes';
import type { Episode } from '@/types';

/** Серии сезона строками: кадр, номер и название, описание, прогресс. */
export function EpisodeList({
    episodes,
    currentId,
}: {
    episodes: Episode[];
    currentId?: string;
}) {
    return (
        <ol className="flex flex-col gap-2">
            {episodes.map((episode) => (
                <li key={episode.id}>
                    <Link
                        href={watch(episode.id)}
                        className={cn(
                            'group flex gap-4 rounded-2xl p-2 transition-colors hover:bg-white/[0.06] md:gap-5 md:p-3',
                            episode.id === currentId && 'bg-white/[0.08]',
                        )}
                    >
                        <div className="relative w-36 shrink-0 overflow-hidden rounded-xl ring-1 ring-white/10 sm:w-52 md:w-60">
                            <Artwork
                                src={episode.landscape ?? episode.poster}
                                item={episode}
                                className="aspect-video"
                            />
                            <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition group-hover:bg-black/35">
                                <Play className="size-8 fill-white text-white opacity-0 drop-shadow-lg transition group-hover:opacity-100" />
                            </div>
                            {episode.progress !== null && (
                                <div className="absolute inset-x-0 bottom-0 h-1 bg-white/25">
                                    <div
                                        className="h-full bg-brand"
                                        style={{
                                            width: `${episode.progress}%`,
                                        }}
                                    />
                                </div>
                            )}
                        </div>
                        <div className="min-w-0 flex-1 py-1">
                            <div className="mb-1 flex items-start gap-2">
                                <h3 className="line-clamp-2 flex-1 font-semibold">
                                    {episode.episode !== null && (
                                        <span className="mr-1.5 text-muted-foreground tabular-nums">
                                            {episode.episode}.
                                        </span>
                                    )}
                                    {episode.name}
                                </h3>
                                {episode.played && (
                                    <Check
                                        className="mt-0.5 size-4 shrink-0 text-brand"
                                        strokeWidth={3}
                                        aria-label="Просмотрено"
                                    />
                                )}
                            </div>
                            <div className="mb-2 text-xs text-muted-foreground">
                                {[
                                    formatRuntime(episode.runtime),
                                    formatDate(episode.premiereDate),
                                ]
                                    .filter(Boolean)
                                    .join(' · ')}
                            </div>
                            {episode.overview && (
                                <p className="line-clamp-2 text-sm text-white/70 max-sm:hidden md:line-clamp-3">
                                    {episode.overview}
                                </p>
                            )}
                        </div>
                    </Link>
                </li>
            ))}
        </ol>
    );
}
