<?php

namespace App\Jellyfin;

/**
 * Jellyfin меряет время тиками по 100 нс, браузер — секундами.
 */
final class Ticks
{
    public const int PER_SECOND = 10_000_000;

    public static function toSeconds(mixed $ticks): ?int
    {
        return is_numeric($ticks) ? (int) round($ticks / self::PER_SECOND) : null;
    }

    public static function fromSeconds(float $seconds): int
    {
        return (int) round($seconds * self::PER_SECOND);
    }
}
