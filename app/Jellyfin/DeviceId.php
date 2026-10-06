<?php

namespace App\Jellyfin;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cookie;
use Illuminate\Support\Str;

/**
 * Постоянный идентификатор браузера для Jellyfin. Сервер привязывает токен
 * к устройству: с тем же DeviceId повторный вход заменяет старую сессию, а не
 * плодит новые записи в «Устройствах».
 */
final class DeviceId
{
    public const string COOKIE = 'jellyfin_device';

    public static function for(Request $request): string
    {
        $id = $request->cookie(self::COOKIE);

        if (is_string($id) && $id !== '') {
            return $id;
        }

        $id = (string) Str::uuid();
        Cookie::queue(Cookie::forever(self::COOKIE, $id));

        return $id;
    }
}
