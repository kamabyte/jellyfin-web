<?php

namespace App\Http\Controllers;

use App\Enums\LibrarySort;
use App\Http\Resources\EpisodeCard;
use App\Http\Resources\ItemCard;
use App\Http\Resources\ItemDetail;
use App\Jellyfin\ItemPage;
use App\Jellyfin\Jellyfin;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Страница элемента. Jellyfin не различает фильм и папку в адресе, поэтому
 * одна точка входа, а страница — по типу: фильм или серия, сериал, папка
 * (курс, коллекция), человек.
 */
class ItemController extends Controller
{
    private const int SIMILAR_SIZE = 16;

    private const int FOLDER_PAGE = 48;

    private const int FILMOGRAPHY_SIZE = 200;

    public function show(Request $request, Jellyfin $jellyfin, string $item): Response|RedirectResponse
    {
        $data = $jellyfin->item($item, ItemDetail::FIELDS);

        return match ($data['Type']) {
            'Season' => redirect()->route('items.show', ['item' => $data['SeriesId'], 'season' => $item]),
            'CollectionFolder', 'UserView' => redirect()->route('libraries.show', $item),
            'Series' => $this->series($request, $jellyfin, $data),
            'Person' => $this->person($jellyfin, $data),
            default => ($data['IsFolder'] ?? false)
                ? $this->folder($request, $jellyfin, $data)
                : $this->video($jellyfin, $data),
        };
    }

    /**
     * @param  array<string, mixed>  $series
     */
    private function series(Request $request, Jellyfin $jellyfin, array $series): Response
    {
        $id = (string) $series['Id'];
        $seasons = $jellyfin->seasons($id);
        $nextUp = $jellyfin->nextUp(1, $id)[0] ?? null;
        $seasonIds = array_column($seasons, 'Id');

        // Открываем сезон из адреса, иначе тот, где следующая серия, иначе
        // первый недосмотренный.
        $seasonId = collect([
            $request->string('season')->toString(),
            $nextUp['SeasonId'] ?? null,
            collect($seasons)->first(fn (array $season): bool => ! data_get($season, 'UserData.Played'))['Id'] ?? null,
            $seasonIds[0] ?? null,
        ])->first(fn (?string $candidate): bool => in_array($candidate, $seasonIds, true));

        $episodes = $seasonId === null ? [] : $jellyfin->episodes($id, $seasonId);
        $similar = $jellyfin->similar($id, self::SIMILAR_SIZE);

        return Inertia::render('series', [
            'series' => (new ItemDetail($series))->resolve(),
            'seasons' => ItemCard::collection($seasons)->resolve(),
            'seasonId' => $seasonId,
            'episodes' => EpisodeCard::collection($episodes)->resolve(),
            'nextUp' => $nextUp === null ? null : (new EpisodeCard($nextUp))->resolve(),
            'similar' => ItemCard::collection($similar)->resolve(),
        ]);
    }

    /**
     * Фильм, серия или просто видео.
     *
     * @param  array<string, mixed>  $item
     */
    private function video(Jellyfin $jellyfin, array $item): Response
    {
        $isEpisode = $item['Type'] === 'Episode';

        // У серии рядом — остальные серии сезона, у фильма — похожие.
        $episodes = $isEpisode && isset($item['SeriesId'])
            ? $jellyfin->episodes((string) $item['SeriesId'], $item['SeasonId'] ?? null)
            : [];
        $similar = $isEpisode ? [] : $jellyfin->similar((string) $item['Id'], self::SIMILAR_SIZE);

        return Inertia::render('item', [
            'item' => (new ItemDetail($item))->resolve(),
            'episodes' => EpisodeCard::collection($episodes)->resolve(),
            'similar' => ItemCard::collection($similar)->resolve(),
        ]);
    }

    /**
     * Папка «прочего видео» (курс, сезон спорта) или коллекция фильмов.
     *
     * @param  array<string, mixed>  $folder
     */
    private function folder(Request $request, Jellyfin $jellyfin, array $folder): Response
    {
        $sort = LibrarySort::tryFrom($request->string('sort')->toString()) ?? LibrarySort::Name;

        $items = ItemPage::fetch($jellyfin, $request, self::FOLDER_PAGE, [
            'parentId' => (string) $folder['Id'],
            'fields' => Jellyfin::CARD_FIELDS,
            ...$sort->query(foldersFirst: true),
        ]);

        return Inertia::render('folder', [
            'folder' => (new ItemDetail($folder))->resolve(),
            'items' => Inertia::scroll(ItemCard::collection($items)),
            'sort' => $sort->value,
            'sorts' => LibrarySort::options(),
        ]);
    }

    /**
     * @param  array<string, mixed>  $person
     */
    private function person(Jellyfin $jellyfin, array $person): Response
    {
        $filmography = $jellyfin->query([
            'personIds' => (string) $person['Id'],
            'recursive' => 'true',
            'includeItemTypes' => 'Movie,Series',
            'sortBy' => 'PremiereDate,ProductionYear,SortName',
            'sortOrder' => 'Descending,Descending,Ascending',
            'fields' => Jellyfin::CARD_FIELDS,
            'limit' => self::FILMOGRAPHY_SIZE,
        ])['items'];

        return Inertia::render('person', [
            'person' => (new ItemDetail($person))->resolve(),
            'items' => ItemCard::collection($filmography)->resolve(),
        ]);
    }
}
