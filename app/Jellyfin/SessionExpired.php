<?php

namespace App\Jellyfin;

use App\Support\Toast;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use RuntimeException;

/**
 * Jellyfin ответил 401 на запрос с токеном: токен отозвали (выход на другом
 * устройстве, удалили в панели) или пользователя больше нет. Выходим и здесь.
 */
class SessionExpired extends RuntimeException
{
    public function render(Request $request): JsonResponse|RedirectResponse
    {
        Auth::logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        if ($request->expectsJson()) {
            return response()->json(['message' => 'Сессия Jellyfin истекла.'], 401);
        }

        Toast::error('Сессия истекла', 'Войдите снова.');

        return redirect()->guest(route('login'));
    }

    public function report(): bool
    {
        return true;
    }
}
