<?php

namespace App\Http\Controllers;

use App\Jellyfin\Jellyfin;
use Illuminate\Http\RedirectResponse;

class FavoriteController extends Controller
{
    public function store(Jellyfin $jellyfin, string $item): RedirectResponse
    {
        $jellyfin->setFavorite($item, true);

        return back();
    }

    public function destroy(Jellyfin $jellyfin, string $item): RedirectResponse
    {
        $jellyfin->setFavorite($item, false);

        return back();
    }
}
