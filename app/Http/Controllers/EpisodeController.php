<?php

namespace App\Http\Controllers;

use App\Http\Resources\EpisodeCard;
use App\Http\Resources\ItemCard;
use App\Jellyfin\Jellyfin;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Сезоны и серии для панели «Серии» в плеере (JSON): её открывают уже во
 * время просмотра, и запуск видео не должен ждать весь список.
 */
class EpisodeController extends Controller
{
    public function index(Request $request, Jellyfin $jellyfin, string $series): JsonResponse
    {
        $seasons = $jellyfin->seasons($series);
        $seasonIds = array_column($seasons, 'Id');
        $requested = $request->string('season')->toString();
        $seasonId = in_array($requested, $seasonIds, true) ? $requested : ($seasonIds[0] ?? null);
        $episodes = $seasonId === null ? [] : $jellyfin->episodes($series, $seasonId);

        return response()->json([
            'seasons' => ItemCard::collection($seasons)->resolve(),
            'seasonId' => $seasonId,
            'episodes' => EpisodeCard::collection($episodes)->resolve(),
        ]);
    }
}
