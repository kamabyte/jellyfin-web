<?php

namespace App\Http\Controllers;

use App\Http\Resources\ItemCard;
use App\Jellyfin\Jellyfin;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class SearchController extends Controller
{
    private const int GROUP_SIZE = 24;

    private const int PEOPLE_SIZE = 12;

    public function __invoke(Request $request, Jellyfin $jellyfin): Response
    {
        // Длинный запрос обрезаем, а не отвергаем: его набирают в шапке.
        $query = Str::limit($request->string('q')->squish()->toString(), 100, '');

        $titles = $query === '' ? [] : $this->search($jellyfin, $query, 'Movie,Series');
        $videos = $query === '' ? [] : $this->search($jellyfin, $query, 'Episode,Video');
        $people = $query === '' ? [] : $jellyfin->people($query, self::PEOPLE_SIZE);

        return Inertia::render('search', [
            'query' => $query,
            'titles' => ItemCard::collection($titles)->resolve(),
            'videos' => ItemCard::collection($videos)->resolve(),
            'people' => ItemCard::collection($people)->resolve(),
        ]);
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function search(Jellyfin $jellyfin, string $query, string $types): array
    {
        return $jellyfin->query([
            'searchTerm' => $query,
            'recursive' => 'true',
            'includeItemTypes' => $types,
            'fields' => Jellyfin::CARD_FIELDS,
            'limit' => self::GROUP_SIZE,
        ])['items'];
    }
}
