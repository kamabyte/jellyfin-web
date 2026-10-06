<?php

namespace App\Jellyfin;

/**
 * Отчёты плеера серверу: по ним Jellyfin ведёт «Продолжить просмотр»,
 * показывает сеанс в панели и гасит транскодирование после остановки.
 */
enum PlaybackEvent: string
{
    case Start = 'start';
    case Progress = 'progress';
    case Stop = 'stop';

    public function path(): string
    {
        return match ($this) {
            self::Start => '/Sessions/Playing',
            self::Progress => '/Sessions/Playing/Progress',
            self::Stop => '/Sessions/Playing/Stopped',
        };
    }
}
