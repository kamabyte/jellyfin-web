import { useEffect, useRef, useState } from 'react';
import { formatDuration } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { Segment, Trickplay } from '@/types';

/** Кадр из листа превью Jellyfin: лист — сетка columns × rows кадров. */
function TrickplayFrame({
    trickplay,
    time,
}: {
    trickplay: Trickplay;
    time: number;
}) {
    const perSheet = trickplay.columns * trickplay.rows;
    const index = Math.min(
        trickplay.count - 1,
        Math.max(0, Math.floor(time / trickplay.interval)),
    );
    const sheet = Math.floor(index / perSheet);
    const cell = index % perSheet;
    const width = 192;
    const scale = width / trickplay.width;

    return (
        <div
            className="mb-1.5 overflow-hidden rounded-lg bg-black ring-1 ring-white/20"
            style={{
                width,
                height: trickplay.height * scale,
                backgroundImage: `url(${trickplay.url.replace('{index}', String(sheet))})`,
                backgroundSize: `${trickplay.columns * width}px auto`,
                backgroundPosition: `-${(cell % trickplay.columns) * width}px -${Math.floor(cell / trickplay.columns) * trickplay.height * scale}px`,
            }}
        />
    );
}

/**
 * Полоса перемотки: буфер, отметки заставки и титров, превью кадра и
 * время под курсором. Позицию читает из <video> сам — так полоса идёт
 * плавно и не перерисовывает весь плеер на каждый кадр.
 */
export function ProgressBar({
    media,
    duration,
    trickplay,
    segments,
    holdAt,
    onScrubChange,
}: {
    media: HTMLVideoElement | null;
    duration: number;
    trickplay: Trickplay | null;
    segments: Segment[];
    /** Держать позицию, пока поток меняется (у нового <video> время с нуля). */
    holdAt: number | null;
    onScrubChange: (scrubbing: boolean) => void;
}) {
    const bar = useRef<HTMLDivElement>(null);
    const [played, setPlayed] = useState(0);
    const [buffered, setBuffered] = useState(0);
    const [hover, setHover] = useState<number | null>(null);
    const [scrub, setScrub] = useState<number | null>(null);
    /** Тянут ли сейчас: отпускание приходит раньше перерисовки после нажатия. */
    const dragging = useRef(false);

    useEffect(() => {
        if (!media) return;
        let frame = 0;
        const tick = () => {
            const total = duration || media.duration;
            if (total > 0) {
                setPlayed(media.currentTime / total);
                const ranges = media.buffered;
                for (let i = 0; i < ranges.length; i++) {
                    if (
                        ranges.start(i) <= media.currentTime + 0.5 &&
                        media.currentTime <= ranges.end(i)
                    ) {
                        setBuffered(ranges.end(i) / total);
                        break;
                    }
                }
            }
            if (!media.paused) frame = requestAnimationFrame(tick);
        };
        const start = () => {
            cancelAnimationFrame(frame);
            frame = requestAnimationFrame(tick);
        };
        start();
        const events = [
            'play',
            'pause',
            'seeked',
            'seeking',
            'progress',
            'loadedmetadata',
            'emptied',
            'timeupdate',
        ];
        events.forEach((name) => media.addEventListener(name, start));
        return () => {
            cancelAnimationFrame(frame);
            events.forEach((name) => media.removeEventListener(name, start));
        };
    }, [media, duration]);

    const fractionAt = (clientX: number) => {
        const rect = bar.current!.getBoundingClientRect();
        return Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    };

    const seekTo = (fraction: number) => {
        if (media && duration > 0) media.currentTime = fraction * duration;
    };

    const shown =
        scrub ?? (holdAt !== null && duration > 0 ? holdAt / duration : played);
    const tip = scrub ?? hover;

    return (
        <div
            ref={bar}
            role="slider"
            aria-label="Перемотка"
            aria-valuemin={0}
            aria-valuemax={Math.round(duration)}
            aria-valuenow={Math.round(shown * duration)}
            aria-valuetext={formatDuration(shown * duration)}
            className="group/bar relative flex h-5 cursor-pointer touch-none items-center"
            onPointerMove={(event) => {
                const fraction = fractionAt(event.clientX);
                if (event.pointerType === 'mouse') setHover(fraction);
                if (dragging.current) setScrub(fraction);
            }}
            onPointerLeave={() => setHover(null)}
            onPointerDown={(event) => {
                if (event.button !== 0) return;
                event.currentTarget.setPointerCapture(event.pointerId);
                dragging.current = true;
                setScrub(fractionAt(event.clientX));
                onScrubChange(true);
            }}
            onPointerUp={(event) => {
                if (!dragging.current) return;
                dragging.current = false;
                event.currentTarget.releasePointerCapture(event.pointerId);
                // Перематываем, когда отпустили: каждый промежуточный seek
                // при перекодировании заставил бы сервер перезапускать ffmpeg.
                seekTo(fractionAt(event.clientX));
                setScrub(null);
                onScrubChange(false);
            }}
            onPointerCancel={() => {
                dragging.current = false;
                setScrub(null);
                onScrubChange(false);
            }}
        >
            <div
                className={cn(
                    'relative h-1 w-full rounded-full bg-white/25 transition-[height] duration-100 group-hover/bar:h-1.5',
                    scrub !== null && 'h-1.5',
                )}
            >
                <div
                    className="absolute inset-y-0 left-0 rounded-full bg-white/35"
                    style={{ width: `${buffered * 100}%` }}
                />
                {duration > 0 &&
                    segments.map((segment, index) =>
                        segment.start === null ||
                        segment.end === null ? null : (
                            <div
                                key={index}
                                className="absolute inset-y-0 bg-amber-300/60"
                                style={{
                                    left: `${(segment.start / duration) * 100}%`,
                                    width: `${((segment.end - segment.start) / duration) * 100}%`,
                                }}
                            />
                        ),
                    )}
                <div
                    className="absolute inset-y-0 left-0 rounded-full bg-brand"
                    style={{ width: `${shown * 100}%` }}
                />
                <div
                    className={cn(
                        'absolute top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 scale-0 rounded-full bg-white shadow transition-transform duration-100 group-hover/bar:scale-100',
                        scrub !== null && 'scale-100',
                    )}
                    style={{ left: `${shown * 100}%` }}
                />
            </div>

            {tip !== null && duration > 0 && (
                <div
                    className="pointer-events-none absolute bottom-full mb-3 flex -translate-x-1/2 flex-col items-center"
                    style={{
                        left: `clamp(6.5rem, ${tip * 100}%, calc(100% - 6.5rem))`,
                    }}
                >
                    {trickplay && (
                        <TrickplayFrame
                            trickplay={trickplay}
                            time={tip * duration}
                        />
                    )}
                    <span className="rounded-md bg-black/80 px-2 py-1 text-xs font-medium text-white tabular-nums">
                        {formatDuration(tip * duration)}
                    </span>
                </div>
            )}
        </div>
    );
}
