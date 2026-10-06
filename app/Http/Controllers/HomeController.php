<?php

namespace App\Http\Controllers;

use App\Http\Resources\ItemCard;
use App\Http\Resources\ItemDetail;
use App\Http\Resources\LibraryCard;
use App\Jellyfin\Jellyfin;
use App\Jellyfin\LibraryKind;
use Inertia\Inertia;
use Inertia\Response;

class HomeController extends Controller
{
    private const int HERO_SIZE = 6;

    private const int SHELF_SIZE = 16;

    public function __invoke(Jellyfin $jellyfin): Response
    {
        // Всё — замыканиями: догрузка полок (частичный запрос) не должна
        // заново спрашивать у сервера витрину и «Продолжить просмотр».
        return Inertia::render('home', [
            'hero' => fn () => ItemDetail::collection($this->hero($jellyfin))->resolve(),
            'resume' => fn () => ItemCard::collection($jellyfin->resume(self::SHELF_SIZE))->resolve(),
            'nextUp' => fn () => ItemCard::collection($jellyfin->nextUp(self::SHELF_SIZE))->resolve(),
            // Полки «Новое в …» — по запросу на медиатеку; приходят следом,
            // чтобы не держать первую отрисовку.
            'shelves' => Inertia::defer(fn () => $this->shelves($jellyfin)),
        ]);
    }

    /**
     * Витрина — свежие фильмы и сериалы, у которых есть фон.
     *
     * @return list<array<string, mixed>>
     */
    private function hero(Jellyfin $jellyfin): array
    {
        return $jellyfin->query([
            'recursive' => 'true',
            'includeItemTypes' => 'Movie,Series',
            'sortBy' => 'DateCreated',
            'sortOrder' => 'Descending',
            'imageTypes' => 'Backdrop',
            'fields' => 'Overview,Genres,Taglines,'.Jellyfin::CARD_FIELDS,
            'limit' => self::HERO_SIZE,
        ])['items'];
    }

    /**
     * @return list<array{library: array<string, mixed>, items: array<int, mixed>}>
     */
    private function shelves(Jellyfin $jellyfin): array
    {
        $libraries = array_filter(
            $jellyfin->views(),
            fn (array $view): bool => LibraryKind::of($view) !== LibraryKind::External,
        );

        $shelves = array_map(fn (array $view): array => [
            'library' => (new LibraryCard($view))->resolve(),
            'items' => ItemCard::collection($jellyfin->latest((string) $view['Id'], self::SHELF_SIZE))->resolve(),
        ], $libraries);

        return array_values(array_filter($shelves, fn (array $shelf): bool => $shelf['items'] !== []));
    }
}
