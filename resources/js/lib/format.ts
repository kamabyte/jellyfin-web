import type { Item } from '@/types';

const numberFormat = new Intl.NumberFormat('ru-RU');
const dateFormat = new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
});
const pluralRules = new Intl.PluralRules('ru-RU');

/** plural(5, ['серия', 'серии', 'серий']) — формы: one, few, many. */
export function plural(count: number, forms: [string, string, string]): string {
    const rule = pluralRules.select(count);
    const form =
        rule === 'one' ? forms[0] : rule === 'few' ? forms[1] : forms[2];

    return `${numberFormat.format(count)} ${form}`;
}

/** 3725 → «1:02:05», 65 → «1:05». */
export function formatDuration(seconds: number): string {
    const total = Math.max(0, Math.round(seconds));
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    const pad = (n: number) => String(n).padStart(2, '0');

    return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

/** Длительность фильма словами: «2 ч 15 мин», «48 мин». */
export function formatRuntime(seconds: number | null): string {
    if (!seconds) {
        return '';
    }

    const minutes = Math.round(seconds / 60);
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;

    if (h === 0) {
        return `${m} мин`;
    }

    return m === 0 ? `${h} ч` : `${h} ч ${m} мин`;
}

/** Сколько осталось досмотреть: «осталось 34 мин». */
export function formatRemaining(item: Item): string {
    if (!item.runtime || item.progress === null) {
        return '';
    }

    return `осталось ${formatRuntime(item.runtime * (1 - item.progress / 100))}`;
}

/** «S1 · E3» — номер серии. */
export function episodeLabel(item: Pick<Item, 'season' | 'episode'>): string {
    if (item.episode === null) {
        return '';
    }

    return item.season === null
        ? `E${item.episode}`
        : `S${item.season} · E${item.episode}`;
}

/** Годы сериала: «2019–2023», «2021–н. в.». */
export function yearRange(
    item: Pick<Item, 'type' | 'year' | 'endYear'>,
    status?: string | null,
): string {
    if (!item.year) {
        return '';
    }

    if (item.type !== 'Series') {
        return String(item.year);
    }

    if (status === 'Continuing') {
        return `${item.year}–н. в.`;
    }

    return item.endYear && item.endYear !== item.year
        ? `${item.year}–${item.endYear}`
        : String(item.year);
}

const UNITS = ['Б', 'КБ', 'МБ', 'ГБ', 'ТБ'];

export function formatBytes(bytes: number | null | undefined): string {
    if (!bytes) {
        return '';
    }

    const exponent = Math.min(
        Math.floor(Math.log(bytes) / Math.log(1024)),
        UNITS.length - 1,
    );
    const value = bytes / 1024 ** exponent;

    return `${value.toLocaleString('ru-RU', { maximumFractionDigits: value >= 100 ? 0 : 1 })} ${UNITS[exponent]}`;
}

export function formatDate(iso: string | null | undefined): string {
    return iso ? dateFormat.format(new Date(iso)) : '';
}

export function initials(name: string): string {
    return name
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((word) => word[0]?.toUpperCase())
        .join('');
}
