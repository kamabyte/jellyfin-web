<?php

namespace App\Http\Controllers;

use App\Http\Requests\LoginRequest;
use App\Jellyfin\InvalidCredentials;
use App\Jellyfin\Jellyfin;
use App\Jellyfin\JellyfinUnavailable;
use App\Jellyfin\JellyfinUser;
use App\Jellyfin\SessionUserProvider;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Cache;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\Response as SymfonyResponse;

/**
 * Вход в клиент учётной записью Jellyfin: пароль проверяет сервер, мы
 * только запоминаем выданный им токен в сессии.
 */
class LoginController extends Controller
{
    public function create(Request $request, Jellyfin $jellyfin): Response
    {
        // Название сервера и включён ли Quick Connect меняются редко, а
        // страница входа не должна падать, если Jellyfin перезагружается.
        $server = Cache::remember('jellyfin.login-info', now()->addMinutes(10), function () use ($jellyfin): array {
            try {
                return [
                    'name' => $jellyfin->publicInfo()['ServerName'] ?? null,
                    'quickConnect' => $jellyfin->quickConnectEnabled(),
                ];
            } catch (JellyfinUnavailable) {
                return ['name' => null, 'quickConnect' => false];
            }
        });

        return Inertia::render('auth/login', [
            'serverName' => $server['name'],
            'quickConnectEnabled' => $server['quickConnect'],
            'quickConnectCode' => $request->session()->get(QuickConnectLoginController::CODE),
        ]);
    }

    public function store(LoginRequest $request, Jellyfin $jellyfin): RedirectResponse
    {
        try {
            $user = $jellyfin->authenticateByName($request->username(), $request->password());
        } catch (InvalidCredentials) {
            throw ValidationException::withMessages(['username' => 'Неверное имя пользователя или пароль.']);
        }

        self::signIn($request, $user);

        return redirect()->intended(route('home'));
    }

    public function destroy(Request $request, Jellyfin $jellyfin): SymfonyResponse
    {
        $jellyfin->logout();

        Auth::logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        // Полная перезагрузка: медиатеки прежнего пользователя браузер
        // держит до неё (Inertia::once в HandleInertiaRequests).
        return Inertia::location(route('login'));
    }

    public static function signIn(Request $request, JellyfinUser $user): void
    {
        // По этим данным SessionUserProvider находит пользователя в
        // следующих запросах.
        $request->session()->put(SessionUserProvider::KEY, $user->toArray());
        Auth::login($user);
        $request->session()->regenerate();
    }
}
