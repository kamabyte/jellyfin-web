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

    /**
     * Шире кадр плеер облегчённой версии не принимает (MAX_WIDTH в
     * public/lite/player.js): 4K пришлось бы уменьшать, а этот сервер 4K не
     * пережимает — такие версии здесь не показываем.
     */
    public const int MAX_WIDTH = 1920;

    public static function active(Request $request): bool
    {
        return $request->cookie(self::COOKIE) === '1';
    }

    /**
     * Карточка видео, которое есть только в 4K. Если версий несколько,
     * среди них, скорее всего, есть поменьше — решает уже страница фильма.
     *
     * @param  array<string, mixed>  $item  ItemCard
     */
    public static function tooLarge(array $item): bool
    {
        return ! $item['isFolder']
            && ($item['versions'] ?? 1) <= 1
            && ($item['width'] ?? 0) > self::MAX_WIDTH;
    }

    /**
     * Какую версию показывать: первую, что не шире MAX_WIDTH. Без сведений
     * о версиях — сам элемент (сервер возьмёт основную); null — все в 4K.
     *
     * @param  array<string, mixed>  $item  ItemDetail
     * @return array{id: string, name: string|null, width: int|null}|null
     */
    public static function version(array $item): ?array
    {
        /** @var list<array{id: string, name: string|null, width: int|null}> $sources */
        $sources = $item['sources'] ?? [];

        if ($sources === []) {
            return ['id' => (string) $item['id'], 'name' => null, 'width' => null];
        }

        foreach ($sources as $source) {
            if (($source['width'] ?? 0) <= self::MAX_WIDTH) {
                return $source;
            }
        }

        return null;
    }
}
