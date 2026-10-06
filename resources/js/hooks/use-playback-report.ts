import { useEffect, useRef } from 'react';
import { postJson } from '@/lib/api';
import playback from '@/routes/playback';
import type { PlaybackSource } from '@/types';

const PROGRESS_EVERY_MS = 10_000;

type Event = 'start' | 'progress' | 'stop';

/**
 * Отчёты серверу о просмотре: начало, позиция раз в 10 секунд и на паузе,
 * остановка. По ним Jellyfin ведёт «Продолжить просмотр», отмечает
 * просмотренное и гасит перекодирование, когда плеер закрыли.
 */
export function usePlaybackReport({
    itemId,
    source,
    media,
    tracks,
}: {
    itemId: string;
    source: PlaybackSource | null;
    media: HTMLVideoElement | null;
    tracks: { audio: number | null; subtitle: number | null };
}) {
    const tracksRef = useRef(tracks);

    useEffect(() => {
        tracksRef.current = tracks;
    });

    useEffect(() => {
        if (!source || !media) return;

        let started = false;
        let stopped = false;
        let lastProgress = 0;
        // Последняя настоящая позиция: когда поток меняют, <video> уже
        // обнулился, а «стоп» должен уйти с тем местом, где остановились.
        let position = media.currentTime;

        const send = (event: Event, keepalive = false) =>
            postJson(
                playback.report.url(event),
                {
                    itemId,
                    mediaSourceId: source.mediaSourceId,
                    playSessionId: source.playSessionId,
                    position,
                    paused: media.paused,
                    playMethod: source.method,
                    audioStreamIndex: tracksRef.current.audio,
                    subtitleStreamIndex: tracksRef.current.subtitle,
                },
                { keepalive },
            ).catch(() => {});

        const progress = () => {
            if (!started || stopped) return;
            if (media.currentTime > 0) position = media.currentTime;
            lastProgress = Date.now();
            void send('progress');
        };
        const onPlaying = () => {
            if (!started) {
                started = true;
                lastProgress = Date.now();
                void send('start');
            } else progress();
        };
        const onTime = () => {
            if (media.currentTime > 0) position = media.currentTime;
            if (Date.now() - lastProgress > PROGRESS_EVERY_MS) progress();
        };
        const stop = () => {
            if (!started || stopped) return;
            stopped = true;
            void send('stop', true);
        };

        media.addEventListener('playing', onPlaying);
        media.addEventListener('pause', progress);
        media.addEventListener('seeked', progress);
        media.addEventListener('timeupdate', onTime);
        media.addEventListener('ended', stop);
        window.addEventListener('pagehide', stop);

        return () => {
            // Смена потока (другая дорожка) или уход со страницы: позиция
            // ещё на месте — <video> отцепляется позже.
            stop();
            media.removeEventListener('playing', onPlaying);
            media.removeEventListener('pause', progress);
            media.removeEventListener('seeked', progress);
            media.removeEventListener('timeupdate', onTime);
            media.removeEventListener('ended', stop);
            window.removeEventListener('pagehide', stop);
        };
    }, [itemId, source, media]);
}
