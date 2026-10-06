<?php

namespace App\Http\Controllers;

use App\Http\Resources\EpisodeCard;
use App\Http\Resources\ItemDetail;
use App\Jellyfin\Jellyfin;
use App\Jellyfin\JellyfinUser;
use App\Jellyfin\Ticks;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Плеер. Сам поток страница запрашивает уже в браузере (PlaybackController):
 * профиль устройства зависит от того, что умеет именно этот браузер.
 */
class WatchController extends Controller
{
    public function show(Request $request, Jellyfin $jellyfin, string $item): Response|RedirectResponse
    {
        $data = $jellyfin->item($item, ItemDetail::FIELDS.',Trickplay');

        // «Смотреть» у сериала — следующая серия, а не сам сериал.
        if ($data['Type'] === 'Series') {
            $episode = $jellyfin->nextUp(1, $item)[0] ?? $jellyfin->episodes($item)[0] ?? null;

            return $episode === null
                ? redirect()->route('items.show', $item)
                : redirect()->route('watch', $episode['Id']);
        }

        if ($data['IsFolder'] ?? false) {
            return redirect()->route('items.show', $item);
        }

        $detail = (new ItemDetail($data))->resolve();
        // ?t= — с этого места (t=0 — с начала), иначе с того, где остановились.
        $startAt = $request->has('t') ? max(0, $request->integer('t')) : ($detail['resumeAt'] ?? 0);
        $next = $data['Type'] === 'Episode' ? $this->nextEpisode($jellyfin, $data) : null;
        $segments = $this->segments($jellyfin, $item);

        return Inertia::render('watch', [
            'item' => $detail,
            'startAt' => $startAt,
            'next' => $next === null ? null : (new EpisodeCard($next))->resolve(),
            'segments' => $segments,
            'trickplay' => $this->trickplay($request, $data),
        ]);
    }

    /**
     * Следующая серия по порядку сериала — и через границу сезона.
     *
     * @param  array<string, mixed>  $episode
     * @return array<string, mixed>|null
     */
    private function nextEpisode(Jellyfin $jellyfin, array $episode): ?array
    {
        if (! isset($episode['SeriesId'])) {
            return null;
        }

        $episodes = $jellyfin->episodes((string) $episode['SeriesId']);
        $index = array_search($episode['Id'], array_column($episodes, 'Id'), true);

        return $index === false ? null : $episodes[$index + 1] ?? null;
    }

    /**
     * Заставки и титры, которые можно пропустить.
     *
     * @return list<array{type: string, start: int|null, end: int|null}>
     */
    private function segments(Jellyfin $jellyfin, string $item): array
    {
        $segments = array_filter(
            $jellyfin->mediaSegments($item),
            fn (array $segment): bool => in_array($segment['Type'] ?? null, ['Intro', 'Recap', 'Outro', 'Preview'], true),
        );

        return array_values(array_map(fn (array $segment): array => [
            'type' => (string) $segment['Type'],
            'start' => Ticks::toSeconds($segment['StartTicks'] ?? null),
            'end' => Ticks::toSeconds($segment['EndTicks'] ?? null),
        ], $segments));
    }

    /**
     * Превью кадров над полосой перемотки — плитки, которые заранее нарезал
     * сервер. Берём самый мелкий размер: их грузят пачками при перемотке.
     *
     * @param  array<string, mixed>  $item
     * @return array<string, mixed>|null
     */
    private function trickplay(Request $request, array $item): ?array
    {
        /** @var array<string, array<string, array<string, int>>> $sources */
        $sources = $item['Trickplay'] ?? [];
        $sourceId = array_key_first($sources);

        if ($sourceId === null || $sources[$sourceId] === []) {
            return null;
        }

        $sizes = $sources[$sourceId];
        ksort($sizes, SORT_NUMERIC);
        $size = array_key_first($sizes);
        $info = $sizes[$size];
        $width = (int) $size;

        /** @var JellyfinUser $user */
        $user = $request->user();

        return [
            'url' => config('jellyfin.public_url')."/Videos/{$item['Id']}/Trickplay/{$width}/{index}.jpg?".http_build_query([
                'mediaSourceId' => $sourceId,
                'ApiKey' => $user->token,
            ]),
            'width' => (int) $info['Width'],
            'height' => (int) $info['Height'],
            'columns' => (int) $info['TileWidth'],
            'rows' => (int) $info['TileHeight'],
            'count' => (int) $info['ThumbnailCount'],
            'interval' => (int) $info['Interval'] / 1000,
        ];
    }
}
