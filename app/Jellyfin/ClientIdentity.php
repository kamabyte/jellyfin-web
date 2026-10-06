<?php

namespace App\Jellyfin;

use Illuminate\Http\Request;

/**
 * Кем клиент представляется Jellyfin в заголовке Authorization. Имя
 * устройства собирается из User-Agent — так в панели Jellyfin видно не
 * безликое «Браузер», а «Safari · macOS».
 */
final readonly class ClientIdentity
{
    public function __construct(
        public string $client,
        public string $version,
        public string $device,
        public string $deviceId,
    ) {}

    public static function forRequest(Request $request, string $deviceId): self
    {
        return new self(
            client: (string) config('jellyfin.client'),
            version: (string) config('jellyfin.version'),
            device: self::deviceName((string) $request->userAgent()),
            deviceId: $deviceId,
        );
    }

    public function header(?string $token = null): string
    {
        $fields = [
            'Client' => $this->client,
            'Device' => $this->device,
            'DeviceId' => $this->deviceId,
            'Version' => $this->version,
        ];

        if ($token !== null) {
            $fields['Token'] = $token;
        }

        // Значения кодируются: заголовок HTTP — только латиница, а имя
        // клиента по-русски. Jellyfin раскодирует их сам.
        $pairs = array_map(
            fn (string $key, string $value): string => sprintf('%s="%s"', $key, rawurlencode($value)),
            array_keys($fields),
            $fields,
        );

        return 'MediaBrowser '.implode(', ', $pairs);
    }

    private static function deviceName(string $userAgent): string
    {
        $browser = match (true) {
            str_contains($userAgent, 'Edg/') => 'Edge',
            str_contains($userAgent, 'YaBrowser/') => 'Яндекс Браузер',
            str_contains($userAgent, 'Firefox/') => 'Firefox',
            str_contains($userAgent, 'Chrome/') => 'Chrome',
            str_contains($userAgent, 'Safari/') => 'Safari',
            default => 'Браузер',
        };

        $system = match (true) {
            str_contains($userAgent, 'iPhone') => 'iPhone',
            str_contains($userAgent, 'iPad') => 'iPad',
            str_contains($userAgent, 'Android') => 'Android',
            str_contains($userAgent, 'Mac OS X') => 'macOS',
            str_contains($userAgent, 'Windows') => 'Windows',
            str_contains($userAgent, 'Linux') => 'Linux',
            default => null,
        };

        return $system === null ? $browser : "{$browser} · {$system}";
    }
}
