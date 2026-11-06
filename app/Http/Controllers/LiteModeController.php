<?php

namespace App\Http\Controllers;

use App\Lite\Lite;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Cookie;

/**
 * Переключатель облегчённой версии. Старый браузер включает её сам (проверка
 * в app.blade.php); вручную — чтобы проверить её с компьютера или вернуться.
 */
class LiteModeController extends Controller
{
    private const int FIVE_YEARS = 60 * 24 * 365 * 5;

    public function __invoke(string $state): RedirectResponse
    {
        $value = $state === 'on' ? '1' : '0';

        return redirect()->route('home')
            ->withCookie(Cookie::make(Lite::COOKIE, $value, self::FIVE_YEARS, httpOnly: false));
    }
}
