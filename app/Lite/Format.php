<?php

namespace App\Lite;

use Carbon\CarbonImmutable;

/**
 * Форматирование для страниц облегчённой версии — то же, что
 * resources/js/lib/format.ts и карточки основного клиента, только на сервере.
 * Элементы — массивы из ItemCard / ItemDetail / EpisodeCard.
 */
final class Format
{
    private const array MONTHS = [
        1 => 'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
        'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря',
    ];

    private const array UNITS = ['Б', 'КБ', 'МБ', 'ГБ', 'ТБ'];

    /**
     * plural(5, ['серия', 'серии', 'серий']) → «5 серий».
     *
     * @param  array{string, string, string}  $forms
     */
    public static function plural(int $count, array $forms): string
    {
        $mod10 = $count % 10;
        $mod100 = $count % 100;

        $form = match (true) {
            $mod10 === 1 && $mod100 !== 11 => $forms[0],
            $mod10 >= 2 && $mod10 <= 4 && ($mod100 < 12 || $mod100 > 14) => $forms[1],
            default => $forms[2],
        };

        return number_format($count, 0, ',', ' ').' '.$form;
    }

    /** 3725 → «1:02:05», 65 → «1:05». */
    public static function duration(float|int|null $seconds): string
    {
        $total = max(0, (int) round((float) $seconds));
        $h = intdiv($total, 3600);
        $m = intdiv($total % 3600, 60);
        $s = $total % 60;

        return $h > 0 ? sprintf('%d:%02d:%02d', $h, $m, $s) : sprintf('%d:%02d', $m, $s);
    }

    /** Длительность словами: «2 ч 15 мин», «48 мин». */
    public static function runtime(float|int|null $seconds): string
    {
        if (! $seconds) {
            return '';
        }

        $minutes = (int) round($seconds / 60);
        $h = intdiv($minutes, 60);
        $m = $minutes % 60;

        if ($h === 0) {
            return "{$m} мин";
        }

        return $m === 0 ? "{$h} ч" : "{$h} ч {$m} мин";
    }

    /**
     * «осталось 34 мин».
     *
     * @param  array<string, mixed>  $item
     */
    public static function remaining(array $item): string
    {
        if (! $item['runtime'] || $item['progress'] === null) {
            return '';
        }

        return 'осталось '.self::runtime($item['runtime'] * (1 - $item['progress'] / 100));
    }

    /**
     * «S1 · E3».
     *
     * @param  array<string, mixed>  $item
     */
    public static function episodeLabel(array $item): string
    {
        if (($item['episode'] ?? null) === null) {
            return '';
        }

        return ($item['season'] ?? null) === null
            ? "E{$item['episode']}"
            : "S{$item['season']} · E{$item['episode']}";
    }

    /**
     * Годы: «2019–2023», «2021–н. в.».
     *
     * @param  array<string, mixed>  $item
     */
    public static function yearRange(array $item, ?string $status = null): string
    {
        if (! ($item['year'] ?? null)) {
            return '';
        }

        if ($item['type'] !== 'Series') {
            return (string) $item['year'];
        }

        if ($status === 'Continuing') {
            return "{$item['year']}–н. в.";
        }

        return $item['endYear'] && $item['endYear'] !== $item['year']
            ? "{$item['year']}–{$item['endYear']}"
            : (string) $item['year'];
    }

    public static function bytes(int|float|null $bytes): string
    {
        if (! $bytes) {
            return '';
        }

        $exponent = min((int) floor(log($bytes, 1024)), count(self::UNITS) - 1);
        $value = $bytes / 1024 ** $exponent;
        $formatted = number_format($value, $value >= 100 ? 0 : 1, ',', ' ');

        return preg_replace('/,0$/', '', $formatted).' '.self::UNITS[$exponent];
    }

    /** «5 марта 2020 г.» */
    public static function date(?string $iso): string
    {
        if (! $iso) {
            return '';
        }

        $date = CarbonImmutable::parse($iso);

        return $date->day.' '.self::MONTHS[$date->month].' '.$date->year.' г.';
    }

    public static function initials(string $name): string
    {
        $words = array_slice(preg_split('/\s+/u', trim($name), -1, PREG_SPLIT_NO_EMPTY) ?: [], 0, 2);

        return implode('', array_map(fn (string $word): string => mb_strtoupper(mb_substr($word, 0, 1)), $words));
    }

    /**
     * Строка под постером: у серии — сериал и номер, у людей — ничего.
     *
     * @param  array<string, mixed>  $item
     */
    public static function cardSubtitle(array $item): string
    {
        return match ($item['type']) {
            'Episode' => implode(' · ', array_filter([$item['seriesName'], self::episodeLabel($item)])),
            'Person' => '',
            default => self::yearRange($item),
        };
    }

    /**
     * Куда ведёт карточка: «продолжить» — сразу в плеер, остальное — на страницу.
     *
     * @param  array<string, mixed>  $item
     */
    public static function href(array $item, bool $play = false): string
    {
        return $play && ! $item['isFolder'] ? route('watch', $item['id']) : route('items.show', $item['id']);
    }

    /**
     * Горизонтальные карточки, если у большинства картинки не постерные.
     *
     * @param  list<array<string, mixed>>  $items
     */
    public static function prefersLandscape(array $items): bool
    {
        $wide = count(array_filter($items, fn (array $item): bool => ($item['aspect'] !== null && $item['aspect'] > 1.2)
            || (! $item['poster'] && $item['landscape'])));

        return $items !== [] && $wide > count($items) / 2;
    }

    /**
     * Сведения строкой: годы, возраст, длительность, жанры (рейтинг — отдельно).
     *
     * @param  array<string, mixed>  $item
     * @return list<string>
     */
    public static function metaParts(array $item, int $genres = 3): array
    {
        return array_values(array_filter([
            self::yearRange($item, $item['status'] ?? null),
            $item['officialRating'] ?? null,
            $item['type'] === 'Series' ? null : self::runtime($item['runtime']),
            mb_strtolower(implode(', ', array_slice($item['genres'] ?? [], 0, $genres))),
        ]));
    }

    /** Ссылка на файл в public/lite с меткой версии — от кэша браузера. */
    public static function asset(string $file): string
    {
        $path = public_path("lite/{$file}");

        return asset("lite/{$file}").'?v='.(is_file($path) ? filemtime($path) : 0);
    }
}
