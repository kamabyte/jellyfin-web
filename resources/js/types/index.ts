/** Карточка — App\Http\Resources\ItemCard. */
export interface Item {
    id: string;
    type: string;
    name: string;
    year: number | null;
    endYear: number | null;
    seriesName: string | null;
    season: number | null;
    episode: number | null;
    isFolder: boolean;
    /** Секунды. */
    runtime: number | null;
    rating: number | null;
    poster: string | null;
    aspect: number | null;
    landscape: string | null;
    played: boolean;
    favorite: boolean;
    /** 0–100, только у начатых. */
    progress: number | null;
    unplayed: number | null;
    childCount: number | null;
}

/** Серия в списке сезона — App\Http\Resources\EpisodeCard. */
export interface Episode extends Item {
    overview: string | null;
    premiereDate: string | null;
}

export interface Person {
    id: string;
    name: string;
    role: string | null;
    image: string | null;
}

export interface MediaInfo {
    resolution: string | null;
    hdr: string | null;
    videoCodec: string | null;
    audio: string | null;
    audioTracks: number;
    subtitles: number;
    container: string | null;
    size: number | null;
}

/** Страница элемента — App\Http\Resources\ItemDetail. */
export interface ItemDetail extends Item {
    overview: string | null;
    tagline: string | null;
    genres: string[];
    studios: string[];
    officialRating: string | null;
    criticRating: number | null;
    premiereDate: string | null;
    status: string | null;
    seriesId: string | null;
    seasonId: string | null;
    parentId: string | null;
    /** Секунды; null — не начинали. */
    resumeAt: number | null;
    backdrop: string | null;
    logo: string | null;
    people: Person[];
    media: MediaInfo | null;
    links: { label: string; url: string }[];
    trailer: string | null;
    builtInUrl: string;
}

export type LibraryKind = 'movies' | 'shows' | 'folders' | 'external';

/** Медиатека — App\Http\Resources\LibraryCard. */
export interface Library {
    id: string;
    name: string;
    kind: LibraryKind;
    collectionType: string | null;
    image: string | null;
    /** Для музыки, ТВ и прочего — ссылка во встроенный клиент. */
    externalUrl: string | null;
}

export interface Option {
    value: string;
    label: string;
}

export interface User {
    id: string;
    name: string;
    isAdmin: boolean;
    avatar: string | null;
}

export interface Toast {
    type: 'success' | 'error';
    message: string;
    description: string | null;
}

/** Пагинатор Laravel в обёртке Inertia::scroll. */
export interface Paginated<T> {
    data: T[];
}

/** Ответ PlaybackController::store — App\Jellyfin\PlaybackSource. */
export interface PlaybackSource {
    playSessionId: string;
    mediaSourceId: string;
    method: 'DirectPlay' | 'Transcode';
    url: string;
    hls: boolean;
    transcodesVideo: boolean;
    reasons: string[];
    audioTracks: AudioTrack[];
    subtitleTracks: SubtitleTrack[];
    audioIndex: number | null;
    subtitleIndex: number | null;
}

export interface AudioTrack {
    index: number;
    label: string;
    language: string | null;
}

export interface SubtitleTrack {
    index: number;
    label: string;
    language: string | null;
    forced: boolean;
    /** VTT; null — картинкой, только вшивать. */
    url: string | null;
}

export interface Segment {
    type: 'Intro' | 'Recap' | 'Outro' | 'Preview';
    start: number | null;
    end: number | null;
}

export interface Trickplay {
    /** С плейсхолдером {index} — номер листа. */
    url: string;
    width: number;
    height: number;
    columns: number;
    rows: number;
    count: number;
    /** Секунд между кадрами. */
    interval: number;
}
