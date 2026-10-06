<?php

namespace App\Jellyfin;

/**
 * Профиль устройства для /PlaybackInfo по тому, что браузер сам сказал о себе
 * (MediaSource.isTypeSupported на клиенте, resources/js/lib/capabilities.ts).
 *
 * Расчёт на слабый сервер: всё, что браузер умеет, играется как есть, а
 * несовместимый контейнер (MKV) перепаковывается в HLS без пережатия видео —
 * для этого HEVC и AV1 разрешены и в профиле транскодирования, и тогда
 * Jellyfin копирует видеопоток. Пережимается только то, что браузеру не
 * по силам (10-бит H.264, Dolby Vision без запасного слоя на не-Apple).
 */
final class DeviceProfile
{
    public const array VIDEO_CODECS = ['h264', 'hevc', 'av1', 'vp9', 'vp8'];

    public const array AUDIO_CODECS = ['aac', 'mp3', 'ac3', 'eac3', 'opus', 'flac', 'vorbis', 'alac'];

    public const array CONTAINERS = ['mp4', 'webm', 'mkv'];

    /**
     * @param  list<string>  $codecs  что декодирует браузер
     * @param  list<string>  $containers  что он открывает напрямую
     * @return array<string, mixed>
     */
    public static function build(array $codecs, array $containers, bool $dolbyVision, int $maxBitrate, bool $audioTrackSwitching = false): array
    {
        $video = array_values(array_intersect(self::VIDEO_CODECS, $codecs));
        $audio = array_values(array_intersect(self::AUDIO_CODECS, $codecs));
        $mp4Video = array_values(array_intersect(['h264', 'hevc', 'av1', 'vp9'], $video));
        $mp4Audio = array_values(array_intersect(['aac', 'mp3', 'ac3', 'eac3', 'opus', 'flac', 'alac'], $audio));

        $directPlay = [[
            'Container' => 'mp4,m4v,mov',
            'Type' => 'Video',
            'VideoCodec' => implode(',', $mp4Video),
            'AudioCodec' => implode(',', $mp4Audio),
        ]];

        if (in_array('webm', $containers, true)) {
            $directPlay[] = [
                'Container' => 'webm',
                'Type' => 'Video',
                'VideoCodec' => implode(',', array_intersect(['vp8', 'vp9', 'av1'], $video)),
                'AudioCodec' => implode(',', array_intersect(['vorbis', 'opus'], $audio)),
            ];
        }

        if (in_array('mkv', $containers, true)) {
            $directPlay[] = [
                'Container' => 'mkv',
                'Type' => 'Video',
                'VideoCodec' => implode(',', $mp4Video),
                'AudioCodec' => implode(',', $mp4Audio),
            ];
        }

        // Видео — в порядке «лучше копировать, чем пережимать»: HEVC и AV1
        // идут первыми, но копируются, только если исходник в них и есть.
        $transcodeVideo = array_values(array_intersect(['hevc', 'av1', 'h264'], $video));
        // Звук при пережатии — в AAC: его понимают все.
        $transcodeAudio = array_values(array_unique(['aac', ...array_intersect(['ac3', 'eac3', 'opus', 'flac', 'mp3'], $audio)]));

        return [
            'Name' => config('jellyfin.client'),
            'MaxStreamingBitrate' => $maxBitrate,
            'MaxStaticBitrate' => $maxBitrate,
            'DirectPlayProfiles' => $directPlay,
            'TranscodingProfiles' => [[
                'Container' => 'mp4',
                'Type' => 'Video',
                'Protocol' => 'hls',
                'Context' => 'Streaming',
                'VideoCodec' => implode(',', $transcodeVideo),
                'AudioCodec' => implode(',', $transcodeAudio),
                'MaxAudioChannels' => '6',
                'MinSegments' => 1,
                'BreakOnNonKeyFrames' => true,
            ]],
            'ContainerProfiles' => [],
            'CodecProfiles' => self::codecProfiles($dolbyVision, $audioTrackSwitching),
            // Текстовые субтитры — отдельным VTT; картинки (PGS, VobSub)
            // браузер не покажет, их сервер может только вшить в видео.
            'SubtitleProfiles' => [
                ['Format' => 'vtt', 'Method' => 'External'],
            ],
        ];
    }

    /**
     * @return list<array<string, mixed>>
     */
    private static function codecProfiles(bool $dolbyVision, bool $audioTrackSwitching): array
    {
        // Чистый Dolby Vision (профиль 5) без HDR10-слоя вне Safari даёт
        // зелёно-фиолетовую картинку — такое только пережимать.
        $ranges = ['SDR', 'HDR10', 'HDR10Plus', 'HLG', 'DOVIWithHDR10', 'DOVIWithHDR10Plus', 'DOVIWithSDR', 'DOVIWithHLG'];

        if ($dolbyVision) {
            $ranges[] = 'DOVI';
        }

        $profiles = [
            [
                'Type' => 'Video',
                'Codec' => 'h264',
                'Conditions' => [
                    ['Condition' => 'LessThanEqual', 'Property' => 'VideoBitDepth', 'Value' => '8', 'IsRequired' => false],
                    ['Condition' => 'EqualsAny', 'Property' => 'VideoRangeType', 'Value' => 'SDR', 'IsRequired' => false],
                ],
            ],
            [
                'Type' => 'Video',
                'Codec' => 'hevc',
                'Conditions' => [
                    ['Condition' => 'EqualsAny', 'Property' => 'VideoRangeType', 'Value' => implode('|', $ranges), 'IsRequired' => false],
                ],
            ],
        ];

        // Браузер играет из файла только дорожку по умолчанию. Без этого
        // условия сервер отдавал файл как есть и на другой дорожке, а звук
        // оставался прежним; с ним — перепаковка с выбранной дорожкой.
        if (! $audioTrackSwitching) {
            $profiles[] = [
                'Type' => 'VideoAudio',
                'Conditions' => [
                    ['Condition' => 'Equals', 'Property' => 'IsSecondaryAudio', 'Value' => 'false', 'IsRequired' => false],
                ],
            ];
        }

        return $profiles;
    }
}
