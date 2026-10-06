<?php

namespace App\Http\Middleware;

use App\Http\Resources\LibraryCard;
use App\Jellyfin\BuiltInClient;
use App\Jellyfin\Image;
use App\Jellyfin\Jellyfin;
use App\Jellyfin\JellyfinUser;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that's loaded on the first page visit.
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        $user = $request->user();

        if (! $user instanceof JellyfinUser) {
            return [
                ...parent::share($request),
                'name' => config('app.name'),
                'auth' => ['user' => null],
            ];
        }

        return [
            ...parent::share($request),
            'name' => config('app.name'),
            'auth' => [
                'user' => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'isAdmin' => $user->isAdmin,
                    'avatar' => Image::user($user->id, $user->imageTag, 96),
                ],
            ],
            // Медиатеки для меню меняются редко: браузер получает их один раз
            // за загрузку страницы, а не с каждым переходом. Выход — полная
            // перезагрузка (LoginController::destroy), чужие не останутся.
            // Без Jellyfin меню пустое, но страница (и страница ошибки) рисуется.
            'libraries' => Inertia::once(fn () => rescue(
                fn () => LibraryCard::collection(app(Jellyfin::class)->views())->resolve(),
                [],
                report: false,
            )),
            'builtIn' => [
                'home' => BuiltInClient::url(),
                'preferences' => BuiltInClient::preferences(),
                'dashboard' => $user->isAdmin ? BuiltInClient::dashboard() : null,
            ],
        ];
    }
}
