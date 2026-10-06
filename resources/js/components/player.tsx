import { router } from '@inertiajs/react';
import type Hls from 'hls.js';
import {
    Airplay,
    ArrowLeft,
    Captions,
    FastForward,
    LoaderCircle,
    Maximize,
    Minimize,
    Pause,
    PictureInPicture2,
    Play,
    RotateCcw,
    Rewind,
    Settings,
    SkipForward,
    Volume2,
    VolumeX,
    X,
} from 'lucide-react';
import {
    type ReactNode,
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';
import { usePlaybackReport } from '@/hooks/use-playback-report';
import { postJson } from '@/lib/api';
import { capabilities } from '@/lib/capabilities';
import { episodeLabel, formatDuration } from '@/lib/format';
import { cn } from '@/lib/utils';
import { watch } from '@/routes';
import playback from '@/routes/playback';
import type {
    Episode,
    ItemDetail,
    PlaybackSource,
    Segment,
    Trickplay,
} from '@/types';
import { ControlButton } from './player/control-button';
import { ProgressBar } from './player/progress-bar';
import { methodLabel, SettingsMenu, SPEEDS } from './player/settings-menu';
import { VolumeControl } from './player/volume-control';

const COUNTDOWN = 10;
const HIDE_CONTROLS_MS = 3000;
const DOUBLE_TAP_MS = 300;
const SEEK_STEP = 10;
const PREFS_KEY = 'jellyfin-web:player:v1';

interface Prefs {
    volume: number;
    muted: boolean;
    rate: number;
}

const DEFAULT_PREFS: Prefs = { volume: 1, muted: false, rate: 1 };

interface Bezel {
    id: number;
    icon: ReactNode;
    text?: string;
    side: 'left' | 'center' | 'right';
}

/** Что просить у сервера: дорожки и можно ли играть файл как есть. */
interface Request {
    startAt: number;
    /** Источник текущего потока: без него Jellyfin не применит дорожки. */
    mediaSourceId: string | null;
    audio: number | null;
    burn: number | null;
    directPlay: boolean;
}

/** Safari-only API: AirPlay и полноэкранный режим iPhone. */
type WebkitVideo = HTMLVideoElement & {
    webkitShowPlaybackTargetPicker?: () => void;
    webkitEnterFullscreen?: () => void;
};

const SEGMENT_LABELS: Record<Segment['type'], string> = {
    Intro: 'Пропустить заставку',
    Recap: 'Пропустить пересказ',
    Preview: 'Пропустить анонс',
    Outro: 'Пропустить титры',
};

function readPrefs(): Prefs {
    try {
        return {
            ...DEFAULT_PREFS,
            ...JSON.parse(localStorage.getItem(PREFS_KEY) ?? '{}'),
        };
    } catch {
        return DEFAULT_PREFS;
    }
}

function writePrefs(prefs: Prefs) {
    try {
        localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
    } catch {
        // только на эту сессию
    }
}

/** Дорожки звука внутри файла — пока только Safari (в типах DOM их нет). */
type AudioTracks = { length: number; [index: number]: { enabled: boolean } };

/**
 * Переключить звук прямо в файле, без нового потока. Номер Jellyfin
 * переводим в порядковый среди дорожек файла; если их число не сходится
 * (внешняя дорожка) — нельзя, нужен новый поток.
 */
function switchNativeAudio(
    media: HTMLVideoElement,
    source: PlaybackSource,
    index: number,
): boolean {
    const tracks = (media as HTMLVideoElement & { audioTracks?: AudioTracks })
        .audioTracks;
    const position = source.audioTracks.findIndex(
        (track) => track.index === index,
    );
    if (
        !tracks ||
        position === -1 ||
        tracks.length !== source.audioTracks.length
    )
        return false;
    for (let i = 0; i < tracks.length; i++) tracks[i].enabled = i === position;
    return true;
}

function isTyping(target: EventTarget | null) {
    const el = target as HTMLElement | null;
    return (
        !!el &&
        (['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName) ||
            el.isContentEditable)
    );
}

/**
 * Плеер Jellyfin во весь экран. Как играть, решает сервер по возможностям
 * браузера: файл как есть, перепаковка в HLS или перекодирование (тогда
 * hls.js). Свои контролы поверх <video>: перемотка с превью кадров,
 * дорожки звука и субтитров, пропуск заставки, следующая серия, горячие
 * клавиши как на YouTube. О просмотре плеер отчитывается серверу.
 */
export function Player({
    item,
    startAt,
    next,
    segments,
    trickplay,
    onBack,
}: {
    item: ItemDetail;
    startAt: number;
    next: Episode | null;
    segments: Segment[];
    trickplay: Trickplay | null;
    onBack: () => void;
}) {
    const container = useRef<HTMLDivElement>(null);
    const ref = useRef<HTMLVideoElement | null>(null);
    const [media, setMedia] = useState<HTMLVideoElement | null>(null);
    const pointerType = useRef('mouse');
    const lastTap = useRef<{ time: number; side: Bezel['side'] } | null>(null);
    const hideTimer = useRef(0);
    const bezelTimer = useRef(0);
    /** С какого места начать новый поток — после смены дорожки тоже. */
    const pendingSeek = useRef(startAt);

    const [request, setRequest] = useState<Request>({
        startAt,
        mediaSourceId: null,
        audio: null,
        burn: null,
        directPlay: true,
    });
    const [source, setSource] = useState<PlaybackSource | null>(null);
    /** Дорожка, включённая прямо в файле (Safari), — поверх той, что в потоке. */
    const [nativeAudio, setNativeAudio] = useState<number | null>(null);
    /** Идёт смена потока: показываем застывший кадр и что переключаем. */
    const [switching, setSwitching] = useState<string | null>(null);
    const snapshot = useRef<HTMLCanvasElement>(null);
    /** Играть ли новый поток сразу: после смены дорожки — как было до неё. */
    const wantPlay = useRef(true);
    const [error, setError] = useState<string | null>(null);
    /** Текстовые субтитры рисуем сами; картиночные сервер вшивает (request.burn). */
    const [subtitle, setSubtitle] = useState<number | null>(null);
    /** Выбирал ли пользователь субтитры сам — тогда умолчание сервера не трогаем. */
    const subtitleChosen = useRef(false);
    const [cue, setCue] = useState('');

    const [paused, setPaused] = useState(true);
    const [ended, setEnded] = useState(false);
    const [started, setStarted] = useState(false);
    const [blocked, setBlocked] = useState(false);
    const [waiting, setWaiting] = useState(false);
    const [currentTime, setCurrentTime] = useState(startAt);
    const [duration, setDuration] = useState(item.runtime ?? 0);
    const [prefs, setPrefs] = useState(readPrefs);
    const [fullscreen, setFullscreen] = useState(false);
    const [pip, setPip] = useState(false);
    const [airplay, setAirplay] = useState(false);
    const [resumedAt, setResumedAt] = useState<number | null>(
        startAt > 0 ? startAt : null,
    );
    const [countdown, setCountdown] = useState<number | null>(null);

    const [active, setActive] = useState(true);
    const [overControls, setOverControls] = useState(false);
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [scrubbing, setScrubbing] = useState(false);
    const [bezel, setBezel] = useState<Bezel | null>(null);

    // Что звучит на самом деле, а не что просили: сервер может отдать поток
    // с другой дорожкой, и интерфейс не должен это скрывать.
    const audio = nativeAudio ?? source?.audioIndex ?? null;
    const loading = !started && !blocked && !error;
    const showControls =
        !loading &&
        (active || paused || overControls || settingsOpen || scrubbing);

    const attach = useCallback((el: HTMLVideoElement | null) => {
        ref.current = el;
        setMedia(el);
    }, []);

    const updatePrefs = useCallback((patch: Partial<Prefs>) => {
        setPrefs((current) => {
            const updated = { ...current, ...patch };
            writePrefs(updated);
            return updated;
        });
    }, []);

    // Спросить сервер, как играть, — при открытии и при смене дорожек.
    useEffect(() => {
        const controller = new AbortController();
        setError(null);

        postJson<PlaybackSource>(
            playback.store.url(item.id),
            {
                ...capabilities(),
                startAt: request.startAt,
                mediaSourceId: request.mediaSourceId,
                audioStreamIndex: request.audio,
                burnSubtitleIndex: request.burn,
                directPlay: request.directPlay,
            },
            { signal: controller.signal },
        )
            .then((next) => {
                pendingSeek.current = request.startAt;
                setSource(next);
                if (!subtitleChosen.current) setSubtitle(next.subtitleIndex);
            })
            .catch((reason: unknown) => {
                if (controller.signal.aborted) return;
                setSwitching(null);
                setError(
                    reason instanceof Error
                        ? reason.message
                        : 'Не удалось получить поток.',
                );
            });

        return () => controller.abort();
    }, [item.id, request]);

    // Отчёты — до подключения потока: при смене потока React снимает эффекты
    // по порядку, и «стоп» уходит, пока в <video> ещё старая позиция.
    usePlaybackReport({
        itemId: item.id,
        source,
        media,
        tracks: { audio, subtitle },
    });

    // Подключить поток к <video>: файл — напрямую, HLS — через hls.js
    // (Safari на iPhone умеет HLS сам).
    useEffect(() => {
        if (!source || !media) return;
        let hls: Hls | null = null;
        let cancelled = false;
        const seek = pendingSeek.current;
        setNativeAudio(null);

        // Новый поток готов показать кадр — убираем застывший.
        const ready = () => setSwitching(null);
        media.addEventListener('canplay', ready, { once: true });
        // Файл как есть, а сервер выбрал не первую дорожку (Safari умеет).
        const pickAudio = () => {
            if (source.method === 'DirectPlay' && source.audioIndex !== null)
                switchNativeAudio(media, source, source.audioIndex);
        };
        media.addEventListener('loadedmetadata', pickAudio, { once: true });

        const play = () =>
            wantPlay.current &&
            media.play().catch((reason: unknown) => {
                if (
                    reason instanceof DOMException &&
                    reason.name === 'NotAllowedError'
                )
                    setBlocked(true);
            });

        // Начало — фрагментом #t=: браузер сам откроет файл с этого места.
        // Перемотка из loadedmetadata срывалась, если в этот момент нажать
        // на видео, и просмотр начинался с нуля.
        const attachNative = () => {
            media.src = seek > 0 ? `${source.url}#t=${seek}` : source.url;
            void play();
        };

        if (!source.hls) {
            attachNative();
        } else {
            void import('hls.js').then(({ default: HlsJs }) => {
                if (cancelled) return;
                if (!HlsJs.isSupported()) {
                    attachNative();
                    return;
                }
                let recovered = false;
                hls = new HlsJs({
                    startPosition: seek,
                    // Первый сегмент ждёт запуска ffmpeg на сервере.
                    manifestLoadingTimeOut: 30_000,
                    fragLoadingTimeOut: 90_000,
                    maxBufferLength: 30,
                    maxMaxBufferLength: 90,
                    // Не отбрасывать HDR-варианты: иначе на экране без HDR
                    // hls.js оставит только SDR — а это у Jellyfin запасной
                    // вариант с полным перекодированием 4K в H.264.
                    videoPreference: {
                        preferHDR: true,
                        allowedVideoRanges: ['SDR', 'PQ', 'HLG'],
                    },
                });
                hls.on(HlsJs.Events.ERROR, (_, data) => {
                    if (!data.fatal) return;
                    if (
                        data.type === HlsJs.ErrorTypes.MEDIA_ERROR &&
                        !recovered
                    ) {
                        recovered = true;
                        hls?.recoverMediaError();
                        return;
                    }
                    setError(
                        'Поток прервался. Сервер мог не справиться с перекодированием.',
                    );
                });
                // У HDR-фильма Jellyfin кладёт в master два варианта: основной
                // (видео копируется, кодеки как в адресе потока) и запасной
                // H.264 SDR. Закрепляем основной; если браузер его не тянет,
                // hls.js сам уберёт его из списка и останется запасной.
                const wanted = new URL(source.url).searchParams.get(
                    'VideoCodec',
                );
                hls.on(HlsJs.Events.MANIFEST_PARSED, (_, data) => {
                    const index = data.levels.findIndex(
                        (level) =>
                            new URL(level.uri, source.url).searchParams.get(
                                'VideoCodec',
                            ) === wanted,
                    );
                    if (index !== -1 && hls) {
                        hls.startLevel = index;
                        hls.currentLevel = index;
                    }
                });
                hls.loadSource(source.url);
                hls.attachMedia(media);
                void play();
            });
        }

        return () => {
            cancelled = true;
            media.removeEventListener('canplay', ready);
            media.removeEventListener('loadedmetadata', pickAudio);
            hls?.destroy();
            media.removeAttribute('src');
            media.load();
        };
    }, [source, media]);

    // Текстовые субтитры: VTT с сервера, реплики рисуем сами (дорожка в
    // режиме hidden) — так они поднимаются над панелью управления.
    const subtitleUrl = useMemo(
        () =>
            source?.subtitleTracks.find((track) => track.index === subtitle)
                ?.url ?? null,
        [source, subtitle],
    );

    useEffect(() => {
        setCue('');
        if (!media || !subtitleUrl) return;
        const track = media.addTextTrack('subtitles');
        track.mode = 'hidden';
        const controller = new AbortController();
        const update = () => {
            const cues = Array.from(track.activeCues ?? []) as VTTCue[];
            setCue(
                cues
                    .map((item) => item.getCueAsHTML().textContent ?? '')
                    .join('\n'),
            );
        };

        fetch(subtitleUrl, { signal: controller.signal })
            .then((response) =>
                response.ok
                    ? response.text()
                    : Promise.reject(new Error(response.statusText)),
            )
            .then((text) => {
                parseVtt(text).forEach((item) => track.addCue(item));
                track.addEventListener('cuechange', update);
                update();
            })
            .catch(() => {});

        return () => {
            controller.abort();
            track.removeEventListener('cuechange', update);
            Array.from(track.cues ?? []).forEach((item) =>
                track.removeCue(item),
            );
            track.mode = 'disabled';
        };
    }, [media, subtitleUrl]);

    // Громкость и скорость переживают перезагрузку.
    useEffect(() => {
        if (!media) return;
        const saved = readPrefs();
        media.volume = saved.volume;
        media.muted = saved.muted;
        media.defaultPlaybackRate = saved.rate;
        media.playbackRate = saved.rate;

        const onPip = () => setPip(document.pictureInPictureElement === media);
        const onAirplay = (event: Event) =>
            setAirplay(
                (event as Event & { availability: string }).availability ===
                    'available',
            );
        media.addEventListener('enterpictureinpicture', onPip);
        media.addEventListener('leavepictureinpicture', onPip);
        media.addEventListener(
            'webkitplaybacktargetavailabilitychanged',
            onAirplay,
        );
        return () => {
            media.removeEventListener('enterpictureinpicture', onPip);
            media.removeEventListener('leavepictureinpicture', onPip);
            media.removeEventListener(
                'webkitplaybacktargetavailabilitychanged',
                onAirplay,
            );
        };
    }, [media]);

    useEffect(() => {
        const onChange = () =>
            setFullscreen(
                !!container.current &&
                    document.fullscreenElement === container.current,
            );
        document.addEventListener('fullscreenchange', onChange);
        return () => document.removeEventListener('fullscreenchange', onChange);
    }, []);

    // «Продолжено с …» — несколько секунд с момента, как видео пошло.
    useEffect(() => {
        if (resumedAt === null || !started) return;
        const timer = window.setTimeout(() => setResumedAt(null), 7000);
        return () => window.clearTimeout(timer);
    }, [resumedAt, started]);

    useEffect(
        () => () => {
            window.clearTimeout(hideTimer.current);
            window.clearTimeout(bezelTimer.current);
        },
        [],
    );

    /** Показать контролы и спрятать снова, если пользователь затих. */
    const poke = useCallback(() => {
        setActive(true);
        window.clearTimeout(hideTimer.current);
        hideTimer.current = window.setTimeout(
            () => setActive(false),
            HIDE_CONTROLS_MS,
        );
    }, []);

    const flash = useCallback(
        (icon: ReactNode, text?: string, side: Bezel['side'] = 'center') => {
            setBezel({ id: Date.now(), icon, text, side });
            window.clearTimeout(bezelTimer.current);
            bezelTimer.current = window.setTimeout(() => setBezel(null), 650);
        },
        [],
    );

    /** Новый поток с текущего места: другая дорожка или вшитые субтитры. */
    /**
     * Новый поток с текущего места: другая дорожка или вшитые субтитры.
     * Как в VLC: кадр застывает (снимок на холсте поверх <video>), контролы
     * остаются, а пауза или воспроизведение — как были.
     */
    const reload = useCallback(
        (patch: Partial<Omit<Request, 'startAt'>>, label: string) => {
            const el = ref.current;
            const canvas = snapshot.current;
            if (el && canvas && el.videoWidth > 0) {
                canvas.width = el.videoWidth;
                canvas.height = el.videoHeight;
                canvas.getContext('2d')?.drawImage(el, 0, 0);
                setSwitching(label);
            }
            wantPlay.current = el ? !el.paused : true;
            const position = el?.currentTime ?? 0;
            setRequest((current) => ({
                ...current,
                ...patch,
                startAt: position,
                mediaSourceId: source?.mediaSourceId ?? current.mediaSourceId,
            }));
        },
        [source],
    );

    const selectAudio = useCallback(
        (index: number) => {
            if (index === audio || !source) return;
            // Safari переключает дорожку в самом файле — мгновенно.
            const el = ref.current;
            if (
                el &&
                source.method === 'DirectPlay' &&
                switchNativeAudio(el, source, index)
            ) {
                setNativeAudio(index);
                return;
            }
            reload({ audio: index }, 'Переключаем звук…');
        },
        [audio, source, reload],
    );

    const selectSubtitle = useCallback(
        (index: number | null) => {
            const track = source?.subtitleTracks.find(
                (entry) => entry.index === index,
            );
            subtitleChosen.current = true;
            setSubtitle(index);
            if (track && !track.url)
                reload({ burn: index }, 'Включаем субтитры…');
            else if (request.burn !== null)
                reload({ burn: null }, 'Переключаем субтитры…');
        },
        [source, request.burn, reload],
    );

    const lastTextSubtitle = useRef<number | null>(null);
    useEffect(() => {
        if (subtitle !== null && subtitleUrl)
            lastTextSubtitle.current = subtitle;
    }, [subtitle, subtitleUrl]);

    const toggleSubtitles = useCallback(() => {
        const texts = source?.subtitleTracks.filter((track) => track.url) ?? [];
        if (texts.length === 0) return;
        const enable = subtitle === null;
        selectSubtitle(
            enable ? (lastTextSubtitle.current ?? texts[0].index) : null,
        );
        flash(<Captions />, enable ? 'Вкл.' : 'Выкл.');
    }, [source, subtitle, selectSubtitle, flash]);

    const togglePlay = useCallback(
        (withBezel = true) => {
            const el = ref.current;
            if (!el) return;
            if (el.paused || el.ended) {
                if (el.ended) el.currentTime = 0;
                void el.play().catch(() => {});
                if (withBezel) flash(<Play className="fill-current" />);
            } else {
                el.pause();
                if (withBezel) flash(<Pause className="fill-current" />);
            }
        },
        [flash],
    );

    const seekBy = useCallback(
        (delta: number) => {
            const el = ref.current;
            if (!el) return;
            el.currentTime = Math.min(
                duration || Infinity,
                Math.max(0, el.currentTime + delta),
            );
            const Icon = delta < 0 ? Rewind : FastForward;
            flash(
                <Icon className="fill-current" />,
                `${Math.abs(delta)} с`,
                delta < 0 ? 'left' : 'right',
            );
        },
        [flash, duration],
    );

    const setVolume = useCallback((volume: number) => {
        const el = ref.current;
        if (!el) return;
        el.volume = volume;
        el.muted = volume === 0;
    }, []);

    const changeVolume = useCallback(
        (delta: number) => {
            const el = ref.current;
            if (!el) return;
            const volume =
                Math.round(
                    Math.min(
                        1,
                        Math.max(0, (el.muted ? 0 : el.volume) + delta),
                    ) * 100,
                ) / 100;
            setVolume(volume);
            flash(
                volume === 0 ? <VolumeX /> : <Volume2 />,
                `${Math.round(volume * 100)}%`,
            );
        },
        [flash, setVolume],
    );

    const toggleMute = useCallback(() => {
        const el = ref.current;
        if (!el) return;
        if (el.muted || el.volume === 0) {
            el.muted = false;
            if (el.volume === 0) el.volume = 0.5;
        } else {
            el.muted = true;
        }
    }, []);

    const setRate = useCallback((rate: number) => {
        const el = ref.current;
        if (!el) return;
        el.defaultPlaybackRate = rate;
        el.playbackRate = rate;
    }, []);

    const stepRate = useCallback(
        (direction: 1 | -1) => {
            const el = ref.current;
            if (!el) return;
            const index = SPEEDS.indexOf(el.playbackRate);
            const rate =
                SPEEDS[
                    Math.min(
                        SPEEDS.length - 1,
                        Math.max(0, (index === -1 ? 2 : index) + direction),
                    )
                ];
            setRate(rate);
            flash(<span className="text-lg font-semibold">{rate}×</span>);
        },
        [flash, setRate],
    );

    const toggleFullscreen = useCallback(() => {
        const box = container.current;
        const el = ref.current as WebkitVideo | null;
        if (document.fullscreenElement) void document.exitFullscreen();
        else if (box?.requestFullscreen)
            void box.requestFullscreen().catch(() => {});
        else el?.webkitEnterFullscreen?.(); // iPhone: только нативный режим
    }, []);

    const togglePip = useCallback(() => {
        const el = ref.current;
        if (!el || !document.pictureInPictureEnabled) return;
        if (document.pictureInPictureElement)
            void document.exitPictureInPicture();
        else void el.requestPictureInPicture().catch(() => {});
    }, []);

    const goNext = useCallback(() => {
        if (next) router.visit(watch(next.id), { replace: true });
    }, [next]);

    // Обратный отсчёт до следующей серии.
    useEffect(() => {
        if (countdown === null) return;
        if (countdown <= 0) {
            goNext();
            return;
        }
        const timer = window.setTimeout(
            () => setCountdown((c) => (c === null ? null : c - 1)),
            1000,
        );
        return () => window.clearTimeout(timer);
    }, [countdown, goNext]);

    // Media Session: название на экране блокировки, «следующий трек».
    useEffect(() => {
        if (!('mediaSession' in navigator)) return;
        navigator.mediaSession.metadata = new MediaMetadata({
            title: item.name,
            artist: item.seriesName ?? undefined,
            artwork: item.poster ? [{ src: item.poster }] : [],
        });
        navigator.mediaSession.setActionHandler(
            'nexttrack',
            next ? goNext : null,
        );
        return () => navigator.mediaSession.setActionHandler('nexttrack', null);
    }, [item, next, goNext]);

    // Горячие клавиши как на YouTube; по event.code — чтобы работали и в
    // русской раскладке.
    useEffect(() => {
        const onKey = (event: KeyboardEvent) => {
            const el = ref.current;
            if (
                !el ||
                isTyping(event.target) ||
                event.metaKey ||
                event.ctrlKey ||
                event.altKey
            )
                return;

            if (
                event.code.startsWith('Digit') &&
                !event.shiftKey &&
                duration > 0
            ) {
                el.currentTime = (Number(event.code.slice(5)) / 10) * duration;
                return;
            }

            switch (event.code) {
                case 'Space':
                case 'KeyK':
                    event.preventDefault();
                    togglePlay();
                    break;
                case 'KeyJ':
                case 'ArrowLeft':
                    event.preventDefault();
                    seekBy(-SEEK_STEP);
                    break;
                case 'KeyL':
                case 'ArrowRight':
                    event.preventDefault();
                    seekBy(SEEK_STEP);
                    break;
                case 'ArrowUp':
                case 'ArrowDown':
                    event.preventDefault();
                    changeVolume(event.code === 'ArrowUp' ? 0.05 : -0.05);
                    break;
                case 'KeyF':
                    toggleFullscreen();
                    break;
                case 'KeyM':
                    toggleMute();
                    flash(el.muted ? <VolumeX /> : <Volume2 />);
                    break;
                case 'KeyI':
                    togglePip();
                    break;
                case 'KeyC':
                    toggleSubtitles();
                    break;
                case 'Comma':
                case 'Period':
                    if (event.shiftKey)
                        stepRate(event.code === 'Period' ? 1 : -1);
                    break;
                case 'KeyN':
                    if (event.shiftKey) goNext();
                    break;
                case 'Escape':
                    if (!document.fullscreenElement && !settingsOpen) onBack();
                    break;
                default:
                    return;
            }
            poke();
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [
        duration,
        goNext,
        togglePlay,
        seekBy,
        changeVolume,
        toggleFullscreen,
        toggleMute,
        togglePip,
        stepRate,
        flash,
        poke,
        toggleSubtitles,
        settingsOpen,
        onBack,
    ]);

    /** Тап на телефоне: показать/спрятать контролы; двойной тап у края — перемотка. */
    const onTap = (clientX: number) => {
        const rect = ref.current!.getBoundingClientRect();
        const x = (clientX - rect.left) / rect.width;
        const side: Bezel['side'] =
            x < 0.35 ? 'left' : x > 0.65 ? 'right' : 'center';
        const now = Date.now();
        const last = lastTap.current;
        lastTap.current = { time: now, side };

        if (
            last &&
            now - last.time < DOUBLE_TAP_MS &&
            last.side === side &&
            side !== 'center'
        ) {
            seekBy(side === 'left' ? -SEEK_STEP : SEEK_STEP);
            return;
        }
        if (showControls && !paused) {
            window.clearTimeout(hideTimer.current);
            setActive(false);
        } else {
            poke();
        }
    };

    // Сегмент под текущей позицией: «пропустить заставку», а на титрах
    // серии — сразу «следующая серия».
    const segment = segments.find(
        (entry) =>
            entry.start !== null &&
            entry.end !== null &&
            currentTime >= entry.start &&
            currentTime < entry.end - 1,
    );
    const nearEnd =
        next !== null && duration > 0 && duration - currentTime < 30 && !ended;
    const offerNext = next !== null && (segment?.type === 'Outro' || nearEnd);

    const canPip =
        typeof document !== 'undefined' && document.pictureInPictureEnabled;
    const hasTextSubtitles = !!source?.subtitleTracks.some(
        (track) => track.url,
    );
    const title =
        item.type === 'Episode' && item.seriesName
            ? item.seriesName
            : item.name;
    const subtitleLine =
        item.type === 'Episode'
            ? [episodeLabel(item), item.name].filter(Boolean).join(' · ')
            : null;

    return (
        <div
            ref={container}
            tabIndex={-1}
            className={cn(
                '@container fixed inset-0 overflow-hidden bg-black text-white outline-none select-none',
                !showControls && 'cursor-none',
            )}
            onPointerMove={(event) => {
                if (event.pointerType === 'mouse') poke();
            }}
            onPointerLeave={(event) => {
                if (event.pointerType === 'mouse' && !paused) {
                    window.clearTimeout(hideTimer.current);
                    setActive(false);
                }
            }}
        >
            <video
                ref={attach}
                playsInline
                poster={blocked ? (item.backdrop ?? undefined) : undefined}
                className="size-full bg-black object-contain"
                onPointerDown={(event) => {
                    pointerType.current = event.pointerType;
                }}
                onClick={(event) => {
                    container.current?.focus({ preventScroll: true });
                    // Пока видео грузится, клик ничего не ставит на паузу.
                    if (settingsOpen || !started) return;
                    if (pointerType.current === 'mouse') togglePlay();
                    else onTap(event.clientX);
                }}
                onDoubleClick={() => {
                    if (pointerType.current === 'mouse') toggleFullscreen();
                }}
                onLoadedMetadata={(event) => {
                    if (
                        event.currentTarget.duration &&
                        Number.isFinite(event.currentTarget.duration)
                    )
                        setDuration(event.currentTarget.duration);
                }}
                onDurationChange={(event) => {
                    if (
                        event.currentTarget.duration &&
                        Number.isFinite(event.currentTarget.duration)
                    )
                        setDuration(event.currentTarget.duration);
                }}
                onTimeUpdate={(event) => {
                    if (!switching)
                        setCurrentTime(event.currentTarget.currentTime);
                }}
                onPause={() => setPaused(true)}
                onPlay={() => {
                    setPaused(false);
                    setEnded(false);
                    setBlocked(false);
                    setCountdown(null);
                    poke();
                }}
                onPlaying={() => {
                    setStarted(true);
                    setWaiting(false);
                }}
                onWaiting={() => setWaiting(true)}
                onCanPlay={() => setWaiting(false)}
                onSeeked={() => setWaiting(false)}
                onVolumeChange={(event) =>
                    updatePrefs({
                        volume: event.currentTarget.volume,
                        muted: event.currentTarget.muted,
                    })
                }
                onRateChange={(event) =>
                    updatePrefs({ rate: event.currentTarget.playbackRate })
                }
                onEnded={() => {
                    setEnded(true);
                    if (next) setCountdown(COUNTDOWN);
                }}
                onError={() => {
                    // Браузер обещал, что справится с файлом, но не смог —
                    // один раз просим у сервера перепаковку.
                    if (source?.method === 'DirectPlay' && request.directPlay)
                        reload({ directPlay: false }, 'Готовим поток…');
                    else if (source && !source.hls)
                        setError('Браузер не смог воспроизвести видео.');
                }}
            />

            {/* Застывший кадр, пока готовится поток с другой дорожкой. */}
            <canvas
                ref={snapshot}
                aria-hidden
                className={cn(
                    'pointer-events-none absolute inset-0 size-full object-contain',
                    switching ? 'block' : 'hidden',
                )}
            />
            {switching && (
                <div className="pointer-events-none absolute inset-0 z-[6] flex items-center justify-center">
                    <div className="flex animate-fade-in items-center gap-2.5 rounded-full bg-black/70 py-2.5 pr-5 pl-4 text-sm font-medium backdrop-blur-md">
                        <LoaderCircle className="size-5 animate-spin" />
                        {switching}
                    </div>
                </div>
            )}

            {cue && (
                <div
                    className={cn(
                        'pointer-events-none absolute inset-x-0 z-[5] flex justify-center px-[8%] text-center transition-[bottom] duration-200',
                        showControls && countdown === null
                            ? 'bottom-32'
                            : 'bottom-[7%]',
                    )}
                >
                    <p className="text-[clamp(16px,2.6cqw,40px)] leading-snug whitespace-pre-line [text-shadow:0_1px_3px_rgb(0_0_0/0.9),0_0_12px_rgb(0_0_0/0.6)]">
                        {cue}
                    </p>
                </div>
            )}

            {bezel && (
                <div
                    className={cn(
                        'pointer-events-none absolute inset-y-0 flex items-center justify-center',
                        bezel.side === 'left' && 'left-0 w-1/3',
                        bezel.side === 'right' && 'right-0 w-1/3',
                        bezel.side === 'center' && 'inset-x-0',
                    )}
                >
                    <div
                        key={bezel.id}
                        className="flex size-20 animate-bezel flex-col items-center justify-center gap-0.5 rounded-full bg-black/60 [&_svg]:size-8"
                    >
                        {bezel.icon}
                        {bezel.text && (
                            <span className="text-xs font-medium tabular-nums">
                                {bezel.text}
                            </span>
                        )}
                    </div>
                </div>
            )}

            {(loading || (waiting && !paused)) && (
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-4">
                    <LoaderCircle className="size-14 animate-spin text-white/90" />
                    {loading && source?.transcodesVideo && (
                        <p className="text-sm text-white/60">
                            Сервер готовит видео…
                        </p>
                    )}
                </div>
            )}

            {blocked && !error && (
                <div className="absolute inset-0 flex items-center justify-center">
                    <button
                        type="button"
                        aria-label="Смотреть"
                        onClick={() => togglePlay(false)}
                        className="inline-flex size-20 items-center justify-center rounded-full bg-white/90 text-black shadow-2xl transition hover:scale-105 [&_svg]:size-9"
                    >
                        <Play className="ml-1 fill-current" />
                    </button>
                </div>
            )}

            {/* Верх: назад и название. */}
            <div
                className={cn(
                    'absolute inset-x-0 top-0 z-10 flex items-start gap-3 bg-linear-to-b from-black/80 to-transparent px-4 pt-4 pb-20 transition-opacity duration-300 md:px-8 md:pt-6',
                    showControls || loading || error
                        ? 'opacity-100'
                        : 'pointer-events-none opacity-0',
                )}
            >
                <ControlButton
                    label="Назад (Esc)"
                    onClick={onBack}
                    className="size-11 [&_svg]:size-6"
                >
                    <ArrowLeft />
                </ControlButton>
                <div className="min-w-0 pt-1">
                    <div className="truncate text-lg font-semibold md:text-xl">
                        {title}
                    </div>
                    {subtitleLine && (
                        <div className="truncate text-sm text-white/70">
                            {subtitleLine}
                        </div>
                    )}
                </div>
            </div>

            {/* Пропуск заставки / следующая серия — над панелью. */}
            {started &&
                !error &&
                countdown === null &&
                (segment || offerNext) && (
                    <div className="absolute right-4 bottom-32 z-20 animate-fade-in md:right-8">
                        {offerNext ? (
                            <button
                                type="button"
                                onClick={goNext}
                                className="inline-flex h-12 items-center gap-2 rounded-xl bg-white px-5 font-semibold text-black shadow-2xl transition hover:bg-white/90"
                            >
                                <SkipForward className="size-5 fill-current" />
                                Следующая серия
                            </button>
                        ) : (
                            segment && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (ref.current && segment.end !== null)
                                            ref.current.currentTime =
                                                segment.end;
                                    }}
                                    className="inline-flex h-12 items-center gap-2 rounded-xl border border-white/30 bg-black/60 px-5 font-semibold backdrop-blur-md transition hover:bg-black/80"
                                >
                                    <SkipForward className="size-5" />
                                    {SEGMENT_LABELS[segment.type]}
                                </button>
                            )
                        )}
                    </div>
                )}

            {/* Панель управления. */}
            <div
                className={cn(
                    'absolute inset-x-0 bottom-0 z-10 transition-opacity duration-300',
                    showControls && countdown === null
                        ? 'opacity-100'
                        : 'pointer-events-none opacity-0',
                )}
                onPointerEnter={(event) =>
                    event.pointerType === 'mouse' && setOverControls(true)
                }
                onPointerLeave={() => setOverControls(false)}
            >
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-linear-to-t from-black/90 to-transparent" />
                <div className="relative px-3 pb-3 md:px-7 md:pb-5">
                    <div className="mb-1 px-1">
                        <ProgressBar
                            media={media}
                            duration={duration}
                            trickplay={trickplay}
                            segments={segments}
                            onScrubChange={setScrubbing}
                            holdAt={switching ? currentTime : null}
                        />
                    </div>
                    <div className="flex items-center gap-1">
                        <ControlButton
                            label={paused ? 'Смотреть (k)' : 'Пауза (k)'}
                            onClick={() => togglePlay(false)}
                        >
                            {ended ? (
                                <RotateCcw />
                            ) : paused ? (
                                <Play className="fill-current" />
                            ) : (
                                <Pause className="fill-current" />
                            )}
                        </ControlButton>
                        <ControlButton
                            label="Назад на 10 с (j)"
                            onClick={() => seekBy(-SEEK_STEP)}
                            className="max-sm:hidden"
                        >
                            <Rewind className="fill-current" />
                        </ControlButton>
                        <ControlButton
                            label="Вперёд на 10 с (l)"
                            onClick={() => seekBy(SEEK_STEP)}
                            className="max-sm:hidden"
                        >
                            <FastForward className="fill-current" />
                        </ControlButton>
                        {next && (
                            <ControlButton
                                label="Следующая серия (Shift+N)"
                                onClick={goNext}
                            >
                                <SkipForward className="fill-current" />
                            </ControlButton>
                        )}
                        <VolumeControl
                            volume={prefs.volume}
                            muted={prefs.muted}
                            onVolume={setVolume}
                            onToggleMute={toggleMute}
                        />
                        <div className="ml-1 text-[13px] whitespace-nowrap text-white/90 tabular-nums">
                            {formatDuration(currentTime)}
                            <span className="text-white/55">
                                {' '}
                                / {formatDuration(duration)}
                            </span>
                        </div>

                        <div className="ml-auto flex items-center gap-1">
                            {hasTextSubtitles && (
                                <ControlButton
                                    label={
                                        subtitle === null
                                            ? 'Включить субтитры (c)'
                                            : 'Выключить субтитры (c)'
                                    }
                                    aria-pressed={subtitle !== null}
                                    onClick={toggleSubtitles}
                                    className={cn(
                                        'relative after:absolute after:inset-x-2.5 after:bottom-1.5 after:h-[3px] after:rounded-full after:bg-brand after:transition-transform',
                                        subtitle === null && 'after:scale-x-0',
                                    )}
                                >
                                    <Captions />
                                </ControlButton>
                            )}
                            {source && (
                                <ControlButton
                                    label="Настройки"
                                    data-settings-toggle
                                    aria-expanded={settingsOpen}
                                    onClick={() =>
                                        setSettingsOpen((open) => !open)
                                    }
                                    className={cn(
                                        '[&_svg]:transition-transform',
                                        settingsOpen && '[&_svg]:rotate-45',
                                    )}
                                >
                                    <Settings />
                                </ControlButton>
                            )}
                            {canPip && (
                                <ControlButton
                                    label={
                                        pip
                                            ? 'Выйти из режима «картинка в картинке» (i)'
                                            : 'Картинка в картинке (i)'
                                    }
                                    onClick={togglePip}
                                    className="max-sm:hidden"
                                >
                                    <PictureInPicture2 />
                                </ControlButton>
                            )}
                            {airplay && (
                                <ControlButton
                                    label="AirPlay"
                                    onClick={() =>
                                        (
                                            ref.current as WebkitVideo | null
                                        )?.webkitShowPlaybackTargetPicker?.()
                                    }
                                >
                                    <Airplay />
                                </ControlButton>
                            )}
                            <ControlButton
                                label={
                                    fullscreen
                                        ? 'Выйти из полноэкранного режима (f)'
                                        : 'Во весь экран (f)'
                                }
                                onClick={toggleFullscreen}
                            >
                                {fullscreen ? <Minimize /> : <Maximize />}
                            </ControlButton>
                        </div>
                    </div>
                </div>
            </div>

            {settingsOpen && source && (
                <SettingsMenu
                    source={source}
                    rate={prefs.rate}
                    onRate={setRate}
                    audio={audio}
                    onAudio={selectAudio}
                    subtitle={subtitle}
                    onSubtitle={selectSubtitle}
                    onClose={() => setSettingsOpen(false)}
                />
            )}

            {resumedAt !== null && started && (
                <div className="absolute top-20 left-4 z-10 flex animate-fade-in items-center gap-1 rounded-full bg-black/70 py-1 pr-1 pl-3 text-[13px] backdrop-blur-md md:top-24 md:left-8">
                    Продолжено с {formatDuration(resumedAt)}
                    <button
                        type="button"
                        onClick={() => {
                            if (ref.current) ref.current.currentTime = 0;
                            setResumedAt(null);
                        }}
                        className="ml-1 inline-flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-1 font-medium hover:bg-white/25"
                    >
                        <RotateCcw className="size-3" />С начала
                    </button>
                </div>
            )}

            {source &&
                started &&
                source.method !== 'DirectPlay' &&
                showControls && (
                    <div className="pointer-events-none absolute top-6 right-4 z-10 rounded-full bg-black/60 px-3 py-1 text-xs text-white/75 backdrop-blur-md md:right-8">
                        {methodLabel(source)}
                    </div>
                )}

            {error && (
                <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-black/85 p-6 text-center">
                    <p className="text-lg font-semibold">
                        Не удалось воспроизвести
                    </p>
                    <p className="max-w-md text-sm text-white/65">{error}</p>
                    <div className="mt-3 flex flex-wrap justify-center gap-2">
                        <button
                            type="button"
                            onClick={() => {
                                setError(null);
                                reload({ directPlay: false }, 'Готовим поток…');
                            }}
                            className="inline-flex h-10 items-center gap-2 rounded-full bg-white px-5 text-sm font-semibold text-black hover:bg-white/90"
                        >
                            <RotateCcw className="size-4" />
                            Ещё раз
                        </button>
                        <a
                            href={item.builtInUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex h-10 items-center rounded-full bg-white/15 px-5 text-sm font-semibold hover:bg-white/25"
                        >
                            Открыть в стандартном клиенте
                        </a>
                    </div>
                </div>
            )}

            {countdown !== null && next && (
                <div className="absolute inset-0 z-20 flex animate-fade-in items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
                    <div className="flex w-full max-w-md flex-col items-center gap-5 text-center">
                        <p className="text-sm text-white/70">
                            Следующая серия через {countdown}
                        </p>
                        <div className="flex w-full items-center gap-4 text-left">
                            {(next.landscape ?? next.poster) && (
                                <img
                                    src={next.landscape ?? next.poster ?? ''}
                                    alt=""
                                    className="aspect-video w-40 rounded-lg object-cover"
                                />
                            )}
                            <div className="min-w-0">
                                <p className="text-sm text-white/60">
                                    {episodeLabel(next)}
                                </p>
                                <p className="line-clamp-2 font-semibold">
                                    {next.name}
                                </p>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={() => setCountdown(null)}
                                className="inline-flex h-11 items-center gap-2 rounded-full bg-white/15 px-5 text-sm font-semibold hover:bg-white/25"
                            >
                                <X className="size-4" />
                                Отмена
                            </button>
                            <button
                                type="button"
                                onClick={goNext}
                                className="inline-flex h-11 items-center gap-2 rounded-full bg-white px-5 text-sm font-semibold text-black hover:bg-white/90"
                            >
                                <SkipForward className="size-4 fill-current" />
                                Смотреть
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function parseTimestamp(value: string): number {
    return value
        .split(':')
        .reduce((total, part) => total * 60 + Number(part), 0);
}

/** WebVTT: блоки «начало --> конец» и текст до пустой строки. */
function parseVtt(text: string): VTTCue[] {
    return text
        .replace(/\r/g, '')
        .split(/\n{2,}/)
        .flatMap((block) => {
            const lines = block.split('\n');
            const at = lines.findIndex((line) => line.includes('-->'));
            if (at === -1) return [];
            const [start, end] = lines[at]
                .split('-->')
                .map((part) => parseTimestamp(part.trim().split(/\s+/)[0]));
            const body = lines
                .slice(at + 1)
                .join('\n')
                .trim();
            return Number.isFinite(start) && Number.isFinite(end) && body
                ? [new VTTCue(start, end, body)]
                : [];
        });
}
