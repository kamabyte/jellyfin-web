<?php

namespace App\Jellyfin;

/**
 * Ссылки на картинки Jellyfin. Браузер берёт их прямо с сервера (картинки
 * отдаются без токена), а тег в ссылке меняется вместе с картинкой — так
 * кеш браузера не показывает старый постер.
 */
final class Image
{
    public static function url(string $itemId, string $type, ?string $tag, int $width): ?string
    {
        if ($tag === null || $tag === '') {
            return null;
        }

        return config('jellyfin.public_url')."/Items/{$itemId}/Images/{$type}?".http_build_query([
            'tag' => $tag,
            'maxWidth' => $width,
            'quality' => 90,
        ]);
    }

    /**
     * Аватар пользователя — у них свой адрес, не /Items.
     */
    public static function user(string $userId, ?string $tag, int $width): ?string
    {
        if ($tag === null || $tag === '') {
            return null;
        }

        return config('jellyfin.public_url').'/UserImage?'.http_build_query([
            'userId' => $userId,
            'tag' => $tag,
            'maxWidth' => $width,
            'quality' => 90,
        ]);
    }

    /**
     * Картинка нужного типа у самого элемента, а если её нет — у родителя
     * (у серии нет фона, у сериала есть).
     *
     * @param  array<string, mixed>  $item
     */
    public static function of(array $item, string $type, int $width): ?string
    {
        $tag = $type === 'Backdrop'
            ? data_get($item, 'BackdropImageTags.0')
            : data_get($item, "ImageTags.{$type}");

        if (is_string($tag)) {
            return self::url((string) $item['Id'], $type, $tag, $width);
        }

        $parent = match ($type) {
            'Backdrop' => ['ParentBackdropItemId', data_get($item, 'ParentBackdropImageTags.0')],
            'Logo' => ['ParentLogoItemId', $item['ParentLogoImageTag'] ?? null],
            'Thumb' => ['ParentThumbItemId', $item['ParentThumbImageTag'] ?? null],
            default => [null, null],
        };

        [$parentKey, $parentTag] = $parent;

        if ($parentKey === null || ! isset($item[$parentKey]) || ! is_string($parentTag)) {
            return null;
        }

        return self::url((string) $item[$parentKey], $type, $parentTag, $width);
    }
}
