<?php

namespace App\Lite;

use Illuminate\Http\Request;

/**
 * Облегчённая версия для старых браузеров (iPad на iOS 10 и т. п.), где
 * основной клиент не запускается: Tailwind v4 и сборка Vite требуют Safari
 * 16.4+. Те же адреса и контроллеры, но страницы рисует Blade
 * (resources/views/lite), а не React.
 *
 * Включается кукой: её ставит проверка в resources/views/app.blade.php, если
 * браузер не тянет основной клиент, или переключатель /lite/on и /lite/off.
 */
final class Lite
{
    public const string COOKIE = 'lite';

    public static function active(Request $request): bool
    {
        return $request->cookie(self::COOKIE) === '1';
    }
}
