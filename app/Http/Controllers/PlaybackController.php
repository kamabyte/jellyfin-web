<?php

namespace App\Http\Controllers;

use App\Http\Requests\PlaybackRequest;
use App\Http\Requests\ReportPlaybackRequest;
use App\Jellyfin\DeviceProfile;
use App\Jellyfin\Jellyfin;
use App\Jellyfin\JellyfinUser;
use App\Jellyfin\PlaybackEvent;
use App\Jellyfin\PlaybackSource;
use App\Jellyfin\PlaybackUnavailable;
use App\Jellyfin\Ticks;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Log;

/**
 * JSON для плеера: откуда брать поток и отчёты о просмотре.
 */
class PlaybackController extends Controller
{
    public function store(PlaybackRequest $request, Jellyfin $jellyfin, string $item): JsonResponse
    {
        /** @var JellyfinUser $user */
        $user = $request->user();
        $maxBitrate = (int) config('jellyfin.max_bitrate');

        $info = $jellyfin->playbackInfo($item, array_filter([
            'DeviceProfile' => DeviceProfile::build(
                $request->codecs(),
                $request->containers(),
                $request->dolbyVision(),
                $maxBitrate,
                $request->audioTrackSwitching(),
            ),
            'MaxStreamingBitrate' => $maxBitrate,
            'StartTimeTicks' => Ticks::fromSeconds($request->startAt()),
            // Без MediaSourceId Jellyfin молча игнорирует AudioStreamIndex и
            // SubtitleStreamIndex (MediaInfoHelper: дорожки применяются, только
            // если источник назван). У файла в одной версии id источника — id
            // самого элемента.
            'MediaSourceId' => $request->mediaSourceId() ?? $item,
            'AudioStreamIndex' => $request->audioStreamIndex(),
            // Без явного -1 сервер возьмёт субтитры по умолчанию и, если они
            // картинкой, начнёт вшивать — а 4K этот сервер не пережмёт.
            'SubtitleStreamIndex' => $request->burnSubtitleIndex() ?? -1,
            'EnableDirectPlay' => $request->directPlay(),
            'EnableDirectStream' => true,
            'EnableTranscoding' => true,
            'AllowVideoStreamCopy' => true,
            'AllowAudioStreamCopy' => true,
            'AutoOpenLiveStream' => true,
        ], fn ($value) => $value !== null));

        try {
            $source = PlaybackSource::fromPlaybackInfo($item, $info, $user->token, $user->deviceId, $request->burnSubtitleIndex());
        } catch (PlaybackUnavailable $e) {
            return response()->json(['message' => $this->reason($e->getMessage())], 422);
        }

        // Перекодирование видео на слабом сервере — событие: 4K так не
        // потянуть. Пишем, что сообщил браузер и почему решил сервер.
        if ($source->transcodesVideo()) {
            Log::warning('Jellyfin перекодирует видео', [
                'item' => $item,
                'reasons' => $source->reasons,
                'url' => preg_replace('/([?&])ApiKey=[^&]*/', '$1ApiKey=…', parse_url($source->url, PHP_URL_PATH).'?'.parse_url($source->url, PHP_URL_QUERY)),
                'browser' => [
                    'codecs' => $request->codecs(),
                    'containers' => $request->containers(),
                    'dolbyVision' => $request->dolbyVision(),
                    'directPlay' => $request->directPlay(),
                    'audio' => $request->audioStreamIndex(),
                    'burnSubtitle' => $request->burnSubtitleIndex(),
                    'userAgent' => $request->userAgent(),
                ],
            ]);
        }

        return response()->json($source->toArray());
    }

    public function report(ReportPlaybackRequest $request, Jellyfin $jellyfin, PlaybackEvent $event): Response
    {
        $jellyfin->reportPlayback($event, $request->body());

        return response()->noContent();
    }

    private function reason(string $code): string
    {
        return match ($code) {
            'NotAllowed' => 'Воспроизведение запрещено для вашей учётной записи.',
            'RateLimitExceeded' => 'Сервер занят другими просмотрами, попробуйте позже.',
            default => 'Сервер не может отдать это видео в браузер.',
        };
    }
}
