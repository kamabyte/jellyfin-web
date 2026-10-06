<?php

namespace App\Http\Controllers;

use App\Enums\LibrarySort;
use App\Http\Resources\ItemCard;
use App\Http\Resources\LibraryCard;
use App\Jellyfin\BuiltInClient;
use App\Jellyfin\ItemPage;
use App\Jellyfin\Jellyfin;
use App\Jellyfin\LibraryKind;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\Response as SymfonyResponse;

/**
 * Медиатека: сетка с сортировкой и фильтрами, подгружается при прокрутке.
 */
class LibraryController extends Controller
{
    private const int PER_PAGE = 48;

    public function show(Request $request, Jellyfin $jellyfin, string $library): Response|SymfonyResponse
    {
        $view = $jellyfin->item($library);
        $kind = LibraryKind::of($view);

        if ($kind === LibraryKind::External) {
            return Inertia::location(BuiltInClient::library($view));
        }

        $sort = LibrarySort::tryFrom($request->string('sort')->toString())
            ?? ($kind === LibraryKind::Folders ? LibrarySort::Name : LibrarySort::Added);
        $unwatched = $request->boolean('unwatched');
        $genre = $request->string('genre')->toString() ?: null;

        $items = ItemPage::fetch($jellyfin, $request, self::PER_PAGE, [
            'parentId' => $library,
            'recursive' => $kind === LibraryKind::Folders ? 'false' : 'true',
            'includeItemTypes' => $kind->itemTypes(),
            'filters' => $unwatched ? 'IsUnplayed' : null,
            'genres' => $genre,
            'fields' => Jellyfin::CARD_FIELDS,
            ...$sort->query(foldersFirst: $kind === LibraryKind::Folders),
        ]);

        $genres = $kind === LibraryKind::Folders ? [] : $jellyfin->genres($library, $kind->itemTypes());

        return Inertia::render('library', [
            'library' => (new LibraryCard($view))->resolve(),
            'items' => Inertia::scroll(ItemCard::collection($items)),
            'filters' => [
                'sort' => $sort->value,
                'unwatched' => $unwatched,
                'genre' => $genre,
            ],
            'sorts' => LibrarySort::options(),
            'genres' => $genres,
        ]);
    }
}
