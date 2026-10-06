<?php

namespace App\Jellyfin;

/**
 * Ссылки во встроенный веб-клиент Jellyfin — туда уходит всё, чего здесь
 * нет: панель управления, музыка, ТВ, книги, плейлисты, настройки профиля.
 */
final class BuiltInClient
{
    public static function url(string $route = 'home'): string
    {
        return config('jellyfin.public_url').'/web/#/'.$route;
    }

    public static function dashboard(): string
    {
        return self::url('dashboard');
    }

    public static function preferences(): string
    {
        return self::url('mypreferencesmenu');
    }

    public static function item(string $id): string
    {
        return self::url('details?'.http_build_query(['id' => $id]));
    }

    /**
     * @param  array<string, mixed>  $view  медиатека из /UserViews
     */
    public static function library(array $view): string
    {
        $id = (string) $view['Id'];
        $type = $view['CollectionType'] ?? null;

        return match ($type) {
            'livetv' => self::url('livetv'),
            'music', 'books', 'musicvideos', 'playlists', 'homevideos' => self::url($type.'?'.http_build_query([
                'topParentId' => $id,
                'collectionType' => $type,
            ])),
            default => self::url('list?'.http_build_query(['parentId' => $id])),
        };
    }
}
