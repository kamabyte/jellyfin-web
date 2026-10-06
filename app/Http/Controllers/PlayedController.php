<?php

namespace App\Http\Controllers;

use App\Jellyfin\Jellyfin;
use Illuminate\Http\RedirectResponse;

/**
 * Отметка «просмотрено» — у сериала или сезона ставится на все серии.
 */
class PlayedController extends Controller
{
    public function store(Jellyfin $jellyfin, string $item): RedirectResponse
    {
        $jellyfin->setPlayed($item, true);

        return back();
    }

    public function destroy(Jellyfin $jellyfin, string $item): RedirectResponse
    {
        $jellyfin->setPlayed($item, false);

        return back();
    }
}
