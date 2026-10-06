<?php

namespace App\Jellyfin;

/**
 * Запрос на вход через Quick Connect: код показываем пользователю, секрет
 * держим в сессии — по нему проверяется, подтвердили ли вход.
 */
final readonly class QuickConnectCode
{
    public function __construct(
        public string $code,
        public string $secret,
    ) {}
}
