<?php

namespace App\Jellyfin;

use Illuminate\Http\Request;
use Illuminate\Pagination\LengthAwarePaginator;

/**
 * Страница выборки /Items в виде обычного пагинатора Laravel — чтобы
 * Inertia::scroll и <InfiniteScroll> работали с Jellyfin как с базой.
 */
final class ItemPage
{
    /**
     * @param  array<string, scalar|null>  $query
     * @return LengthAwarePaginator<int, array<string, mixed>>
     */
    public static function fetch(Jellyfin $jellyfin, Request $request, int $perPage, array $query): LengthAwarePaginator
    {
        $page = max(1, $request->integer('page', 1));

        $result = $jellyfin->query([
            ...$query,
            'startIndex' => ($page - 1) * $perPage,
            'limit' => $perPage,
        ]);

        $paginator = new LengthAwarePaginator($result['items'], $result['total'], $perPage, $page, [
            'path' => $request->url(),
        ]);

        return $paginator->withQueryString();
    }
}
