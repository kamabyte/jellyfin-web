<?php

namespace App\Http\Controllers;

use App\Jellyfin\Jellyfin;
use Illuminate\Http\RedirectResponse;

/**
 * «Продолжить просмотр» на главной: убрать оттуда, не отмечая просмотренным.
 */
class ResumeController extends Controller
{
    public function destroy(Jellyfin $jellyfin, string $item): RedirectResponse
    {
        $jellyfin->clearResume($item);

        return back();
    }
}
