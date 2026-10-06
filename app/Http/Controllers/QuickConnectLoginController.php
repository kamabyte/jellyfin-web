<?php

namespace App\Http\Controllers;

use App\Jellyfin\InvalidCredentials;
use App\Jellyfin\Jellyfin;
use App\Support\Toast;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

/**
 * Вход кодом Quick Connect: страница входа показывает код и раз в пару
 * секунд спрашивает check, пока вход не подтвердят на другом устройстве.
 * Секрет запроса живёт только в сессии — браузеру он не нужен.
 */
class QuickConnectLoginController extends Controller
{
    public const string CODE = 'quick-connect.code';

    private const string SECRET = 'quick-connect.secret';

    public function store(Request $request, Jellyfin $jellyfin): RedirectResponse
    {
        $code = $jellyfin->initiateQuickConnect();

        $request->session()->put([self::CODE => $code->code, self::SECRET => $code->secret]);

        return back();
    }

    public function check(Request $request, Jellyfin $jellyfin): RedirectResponse
    {
        $secret = $request->session()->get(self::SECRET);

        if (! is_string($secret)) {
            return back();
        }

        try {
            if (! $jellyfin->quickConnectAuthorized($secret)) {
                return back();
            }

            $user = $jellyfin->authenticateWithQuickConnect($secret);
        } catch (InvalidCredentials) {
            $request->session()->forget([self::CODE, self::SECRET]);
            Toast::error('Код устарел', 'Запросите новый.');

            return back();
        }

        $request->session()->forget([self::CODE, self::SECRET]);
        LoginController::signIn($request, $user);

        return redirect()->intended(route('home'));
    }

    public function destroy(Request $request): RedirectResponse
    {
        $request->session()->forget([self::CODE, self::SECRET]);

        return back();
    }
}
