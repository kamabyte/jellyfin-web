<?php

namespace App\Jellyfin;

/**
 * Что отвечать плееру: адрес потока и дорожки. Собирается из ответа
 * /PlaybackInfo; ссылки — на публичный адрес Jellyfin, видео идёт мимо PHP.
 */
final readonly class PlaybackSource
{
    /** Причины, при которых пережимается видео, а не только звук или контейнер. */
    private const array VIDEO_REASONS = [
        'VideoCodecNotSupported', 'VideoProfileNotSupported', 'VideoLevelNotSupported',
        'VideoResolutionNotSupported', 'VideoBitDepthNotSupported', 'VideoFramerateNotSupported',
        'RefFramesNotSupported', 'AnamorphicVideoNotSupported', 'InterlacedVideoNotSupported',
        'VideoRangeTypeNotSupported', 'VideoBitrateNotSupported', 'VideoCodecTagNotSupported',
        'SubtitleCodecNotSupported', 'ContainerBitrateExceedsLimit',
    ];

    /**
     * @param  list<string>  $reasons
     * @param  list<array<string, mixed>>  $audioTracks
     * @param  list<array<string, mixed>>  $subtitleTracks
     */
    public function __construct(
        public string $playSessionId,
        public string $mediaSourceId,
        public PlayMethod $method,
        public string $url,
        public array $reasons,
        public array $audioTracks,
        public array $subtitleTracks,
        public ?int $audioIndex,
        public ?int $subtitleIndex,
    ) {}

    /**
     * @param  array<string, mixed>  $info  ответ /Items/{id}/PlaybackInfo
     *
     * @throws PlaybackUnavailable
     */
    public static function fromPlaybackInfo(string $itemId, array $info, string $token, string $deviceId, ?int $burnSubtitleIndex): self
    {
        /** @var array<string, mixed>|null $source */
        $source = data_get($info, 'MediaSources.0');

        if ($source === null) {
            throw new PlaybackUnavailable((string) ($info['ErrorCode'] ?? 'NoCompatibleStream'));
        }

        $base = (string) config('jellyfin.public_url');
        $sourceId = (string) $source['Id'];
        $playSessionId = (string) ($info['PlaySessionId'] ?? '');

        if ($source['SupportsDirectPlay'] ?? false) {
            $method = PlayMethod::DirectPlay;
            // Без расширения: по .mov сервер отдаёт video/quicktime, и Firefox
            // такой файл не берёт; без него — тип по самому файлу.
            $url = "{$base}/Videos/{$itemId}/stream?".http_build_query([
                'static' => 'true',
                'mediaSourceId' => $sourceId,
                'deviceId' => $deviceId,
                'playSessionId' => $playSessionId,
                'tag' => $source['ETag'] ?? null,
                // Jellyfin 12 принимает ключ в адресе только как ApiKey.
                'ApiKey' => $token,
            ]);
        } elseif (isset($source['TranscodingUrl'])) {
            $method = PlayMethod::Transcode;
            $url = $base.$source['TranscodingUrl'];
        } else {
            throw new PlaybackUnavailable((string) ($info['ErrorCode'] ?? 'NoCompatibleStream'));
        }

        parse_str((string) parse_url($url, PHP_URL_QUERY), $query);
        $reasons = is_string($query['TranscodeReasons'] ?? null)
            ? array_values(array_filter(explode(',', $query['TranscodeReasons'])))
            : [];

        /** @var list<array<string, mixed>> $streams */
        $streams = $source['MediaStreams'] ?? [];
        $subtitleTracks = self::subtitleTracks($streams, $base, $token);

        // Субтитры по умолчанию (по настройкам пользователя) включаем, только
        // если они текстовые: картиночные пришлось бы вшивать.
        $default = $source['DefaultSubtitleStreamIndex'] ?? null;
        $defaultIsText = collect($subtitleTracks)->contains(
            fn (array $track): bool => $track['index'] === $default && $track['url'] !== null,
        );

        return new self(
            playSessionId: $playSessionId,
            mediaSourceId: $sourceId,
            method: $method,
            url: $url,
            reasons: $reasons,
            audioTracks: self::audioTracks($streams),
            subtitleTracks: $subtitleTracks,
            audioIndex: self::audioIndex($source, $query),
            subtitleIndex: $burnSubtitleIndex ?? ($defaultIsText ? (int) $default : null),
        );
    }

    public function transcodesVideo(): bool
    {
        return array_intersect($this->reasons, self::VIDEO_REASONS) !== [];
    }

    /**
     * @return array<string, mixed>
     */
    public function toArray(): array
    {
        return [
            'playSessionId' => $this->playSessionId,
            'mediaSourceId' => $this->mediaSourceId,
            'method' => $this->method->value,
            'url' => $this->url,
            'hls' => $this->method === PlayMethod::Transcode,
            'transcodesVideo' => $this->transcodesVideo(),
            'reasons' => $this->reasons,
            'audioTracks' => $this->audioTracks,
            'subtitleTracks' => $this->subtitleTracks,
            'audioIndex' => $this->audioIndex,
            'subtitleIndex' => $this->subtitleIndex,
        ];
    }

    /**
     * Какая дорожка звучит на самом деле: при перекодировании — та, что в
     * адресе потока, при файле как есть — выбранная сервером по умолчанию.
     *
     * @param  array<string, mixed>  $source
     * @param  array<int|string, mixed>  $query
     */
    private static function audioIndex(array $source, array $query): ?int
    {
        if (is_numeric($query['AudioStreamIndex'] ?? null)) {
            return (int) $query['AudioStreamIndex'];
        }

        return isset($source['DefaultAudioStreamIndex']) ? (int) $source['DefaultAudioStreamIndex'] : null;
    }

    /**
     * @param  list<array<string, mixed>>  $streams
     * @return list<array<string, mixed>>
     */
    private static function audioTracks(array $streams): array
    {
        return array_values(array_map(fn (array $stream): array => [
            'index' => (int) $stream['Index'],
            'label' => (string) ($stream['DisplayTitle'] ?? $stream['Language'] ?? 'Дорожка '.$stream['Index']),
            'language' => $stream['Language'] ?? null,
        ], array_filter($streams, fn (array $stream): bool => $stream['Type'] === 'Audio')));
    }

    /**
     * Текстовые — со ссылкой на VTT; у картиночных ссылки нет: их можно
     * только вшить, и тогда сервер пережимает видео.
     *
     * @param  list<array<string, mixed>>  $streams
     * @return list<array<string, mixed>>
     */
    private static function subtitleTracks(array $streams, string $base, string $token): array
    {
        return array_values(array_map(function (array $stream) use ($base, $token): array {
            $url = null;

            if (($stream['DeliveryMethod'] ?? null) === 'External' && isset($stream['DeliveryUrl'])) {
                $url = $base.$stream['DeliveryUrl'];

                if (! str_contains($url, 'ApiKey=')) {
                    $url .= (str_contains($url, '?') ? '&' : '?').'ApiKey='.$token;
                }
            }

            return [
                'index' => (int) $stream['Index'],
                'label' => (string) ($stream['DisplayTitle'] ?? $stream['Language'] ?? 'Субтитры '.$stream['Index']),
                'language' => $stream['Language'] ?? null,
                'forced' => (bool) ($stream['IsForced'] ?? false),
                'url' => $url,
            ];
        }, array_filter($streams, fn (array $stream): bool => $stream['Type'] === 'Subtitle')));
    }
}
