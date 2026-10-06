import {
    AudioLines,
    Captions,
    Check,
    ChevronLeft,
    ChevronRight,
    Gauge,
    Info,
} from 'lucide-react';
import { type ReactNode, useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import type { PlaybackSource } from '@/types';

export const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];

const speedLabel = (rate: number) => (rate === 1 ? 'Обычная' : `${rate}×`);

/** Как идёт поток — человеческими словами. */
export function methodLabel(source: PlaybackSource): string {
    if (source.method === 'DirectPlay') return 'Файл как есть';
    return source.transcodesVideo
        ? 'Перекодирование'
        : 'Перепаковка без пережатия';
}

const REASONS: Record<string, string> = {
    ContainerNotSupported: 'контейнер',
    VideoCodecNotSupported: 'видеокодек',
    AudioCodecNotSupported: 'аудиокодек',
    AudioChannelsNotSupported: 'число каналов звука',
    SubtitleCodecNotSupported: 'вшитые субтитры',
    VideoRangeTypeNotSupported: 'HDR / Dolby Vision',
    VideoBitDepthNotSupported: 'глубина цвета',
    DirectPlayError: 'ошибка прямого воспроизведения',
    SecondaryAudioNotSupported: 'выбранная дорожка',
};

type Page = 'main' | 'speed' | 'audio' | 'subtitles' | 'info';

interface Choice<T> {
    value: T;
    label: string;
    hint?: string;
}

/**
 * Панель настроек внутри плеера. Не Radix-меню: его портал рендерится в
 * <body> и в полноэкранном режиме оказывается за пределами видимого.
 */
export function SettingsMenu({
    source,
    rate,
    onRate,
    audio,
    onAudio,
    subtitle,
    onSubtitle,
    onClose,
}: {
    source: PlaybackSource;
    rate: number;
    onRate: (rate: number) => void;
    audio: number | null;
    onAudio: (index: number) => void;
    subtitle: number | null;
    onSubtitle: (index: number | null) => void;
    onClose: () => void;
}) {
    const ref = useRef<HTMLDivElement>(null);
    const [page, setPage] = useState<Page>('main');

    useEffect(() => {
        const onDown = (event: PointerEvent) => {
            const target = event.target as HTMLElement;
            if (
                !ref.current?.contains(target) &&
                !target.closest('[data-settings-toggle]')
            )
                onClose();
        };
        const onKey = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                event.stopPropagation();
                onClose();
            }
        };
        document.addEventListener('pointerdown', onDown);
        document.addEventListener('keydown', onKey, true);
        return () => {
            document.removeEventListener('pointerdown', onDown);
            document.removeEventListener('keydown', onKey, true);
        };
    }, [onClose]);

    const row =
        'flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm hover:bg-white/10';
    const audioLabel = source.audioTracks.find(
        (track) => track.index === audio,
    )?.label;
    const subtitleLabel = source.subtitleTracks.find(
        (track) => track.index === subtitle,
    )?.label;

    const back = (title: string) => (
        <button
            type="button"
            className={cn(row, 'border-b border-white/15 pb-3 font-semibold')}
            onClick={() => setPage('main')}
        >
            <ChevronLeft className="size-5" />
            {title}
        </button>
    );

    function list<T>(
        choices: Choice<T>[],
        current: T,
        onPick: (value: T) => void,
    ) {
        return (
            <div className="max-h-72 overflow-y-auto pt-1">
                {choices.map((choice) => (
                    <button
                        key={String(choice.value)}
                        type="button"
                        className={row}
                        onClick={() => {
                            onPick(choice.value);
                            onClose();
                        }}
                    >
                        <Check
                            className={cn(
                                'size-4 shrink-0',
                                choice.value !== current && 'invisible',
                            )}
                        />
                        <span className="min-w-0 flex-1">
                            <span className="block truncate">
                                {choice.label}
                            </span>
                            {choice.hint && (
                                <span className="block text-xs text-white/50">
                                    {choice.hint}
                                </span>
                            )}
                        </span>
                    </button>
                ))}
            </div>
        );
    }

    const entry = (
        target: Page,
        icon: ReactNode,
        label: string,
        value?: string,
    ) => (
        <button type="button" className={row} onClick={() => setPage(target)}>
            {icon}
            <span className="flex-1">{label}</span>
            {value && (
                <span className="max-w-28 truncate text-white/70">{value}</span>
            )}
            <ChevronRight className="size-4 shrink-0 text-white/70" />
        </button>
    );

    return (
        <div
            ref={ref}
            className="absolute right-3 bottom-20 z-30 w-72 max-w-[calc(100%-1.5rem)] animate-fade-in overflow-hidden rounded-xl bg-black/85 py-2 text-white shadow-xl backdrop-blur-md"
            onClick={(event) => event.stopPropagation()}
        >
            {page === 'main' && (
                <>
                    {source.audioTracks.length > 1 &&
                        entry(
                            'audio',
                            <AudioLines className="size-5" />,
                            'Звук',
                            audioLabel,
                        )}
                    {source.subtitleTracks.length > 0 &&
                        entry(
                            'subtitles',
                            <Captions className="size-5" />,
                            'Субтитры',
                            subtitleLabel ?? 'Выкл.',
                        )}
                    {entry(
                        'speed',
                        <Gauge className="size-5" />,
                        'Скорость',
                        speedLabel(rate),
                    )}
                    {entry(
                        'info',
                        <Info className="size-5" />,
                        'Воспроизведение',
                        methodLabel(source),
                    )}
                </>
            )}

            {page === 'audio' && (
                <>
                    {back('Звук')}
                    {list<number | null>(
                        source.audioTracks.map((track) => ({
                            value: track.index,
                            label: track.label,
                        })),
                        audio,
                        (index) => index !== null && onAudio(index),
                    )}
                </>
            )}

            {page === 'subtitles' && (
                <>
                    {back('Субтитры')}
                    {list<number | null>(
                        [
                            { value: null, label: 'Выкл.' },
                            ...source.subtitleTracks.map((track) => ({
                                value: track.index,
                                label: track.label,
                                hint: track.url
                                    ? undefined
                                    : 'Картинкой — сервер вшьёт их в видео',
                            })),
                        ],
                        subtitle,
                        onSubtitle,
                    )}
                </>
            )}

            {page === 'speed' && (
                <>
                    {back('Скорость')}
                    {list(
                        SPEEDS.map((speed) => ({
                            value: speed,
                            label: speedLabel(speed),
                        })),
                        rate,
                        onRate,
                    )}
                </>
            )}

            {page === 'info' && (
                <>
                    {back('Воспроизведение')}
                    <div className="space-y-2 px-4 py-3 text-sm">
                        <p className="font-medium">{methodLabel(source)}</p>
                        {source.reasons.length > 0 && (
                            <p className="text-white/60">
                                Браузеру не подошло:{' '}
                                {source.reasons
                                    .map((reason) => REASONS[reason] ?? reason)
                                    .join(', ')}
                                .
                            </p>
                        )}
                        {source.transcodesVideo && (
                            <p className="text-amber-300/90">
                                Сервер пережимает видео — 4K так может не пойти.
                                Лучше открыть в Safari или приложении Jellyfin.
                            </p>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}
