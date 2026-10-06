<?php

namespace App\Jellyfin;

/**
 * Как показывать медиатеку. Фильмы и сериалы — сеткой постеров по всей
 * глубине; «прочее видео» (спорт, курсы) и коллекции — по папкам, как они
 * лежат на диске; остальное (музыка, ТВ, книги) — во встроенном клиенте.
 */
enum LibraryKind: string
{
    case Movies = 'movies';
    case Shows = 'shows';
    case Folders = 'folders';
    case External = 'external';

    /**
     * @param  array<string, mixed>  $view  медиатека из /UserViews
     */
    public static function of(array $view): self
    {
        return match ($view['CollectionType'] ?? null) {
            'movies' => self::Movies,
            'tvshows' => self::Shows,
            null, 'mixed', 'homevideos', 'boxsets', 'folders' => self::Folders,
            default => self::External,
        };
    }

    /** Что выбирать из медиатеки; null — содержимое папки как есть. */
    public function itemTypes(): ?string
    {
        return match ($this) {
            self::Movies => 'Movie',
            self::Shows => 'Series',
            self::Folders, self::External => null,
        };
    }
}
