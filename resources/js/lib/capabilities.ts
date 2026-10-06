/**
 * Что этот браузер умеет декодировать — из этого сервер строит профиль
 * устройства (App\Jellyfin\DeviceProfile). Проверяем и MSE (через него
 * играет hls.js), и обычный <video> (прямое воспроизведение файла).
 */
export interface Capabilities {
    codecs: string[];
    containers: string[];
    dolbyVision: boolean;
    /** Дорожки звука внутри файла (Safari) — без нового потока. */
    audioTrackSwitching: boolean;
}

const PROBES: Record<string, string[]> = {
    h264: ['video/mp4; codecs="avc1.640029"'],
    // HEVC — сразу 10-бит: 4K-фильмы почти все такие, а браузер, который
    // умеет только 8-бит, на них всё равно споткнётся.
    hevc: [
        'video/mp4; codecs="hvc1.2.4.L153.B0"',
        'video/mp4; codecs="hev1.2.4.L153.B0"',
    ],
    av1: ['video/mp4; codecs="av01.0.08M.10"'],
    vp9: [
        'video/webm; codecs="vp09.00.10.08"',
        'video/mp4; codecs="vp09.00.10.08"',
    ],
    vp8: ['video/webm; codecs="vp8"'],
    aac: ['audio/mp4; codecs="mp4a.40.2"'],
    mp3: ['audio/mpeg', 'audio/mp4; codecs="mp4a.6B"'],
    ac3: ['audio/mp4; codecs="ac-3"'],
    eac3: ['audio/mp4; codecs="ec-3"'],
    opus: ['audio/mp4; codecs="opus"', 'audio/webm; codecs="opus"'],
    flac: ['audio/mp4; codecs="flac"'],
    vorbis: ['audio/webm; codecs="vorbis"'],
    alac: ['audio/mp4; codecs="alac"'],
};

let cached: Capabilities | null = null;

export function capabilities(): Capabilities {
    if (cached) return cached;

    const video = document.createElement('video');
    const mse =
        window.MediaSource ??
        (window as unknown as { ManagedMediaSource?: typeof MediaSource })
            .ManagedMediaSource;
    const can = (type: string) =>
        (mse?.isTypeSupported(type) ?? false) || video.canPlayType(type) !== '';

    const codecs = Object.entries(PROBES)
        .filter(([, types]) => types.some(can))
        .map(([codec]) => codec);

    const containers = ['mp4'];
    if (video.canPlayType('video/webm') !== '') containers.push('webm');
    if (video.canPlayType('video/x-matroska') !== '') containers.push('mkv');

    cached = {
        codecs,
        containers,
        dolbyVision: can('video/mp4; codecs="dvh1.05.06"'),
        audioTrackSwitching: 'audioTracks' in HTMLMediaElement.prototype,
    };

    return cached;
}
