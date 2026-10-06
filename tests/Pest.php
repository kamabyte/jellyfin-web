<?php

use App\Http\Middleware\HandleInertiaRequests;
use App\Jellyfin\JellyfinUser;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Request;
use Tests\TestCase;

pest()->extend(TestCase::class)
    ->use(RefreshDatabase::class)
    ->in('Feature');

/** Войти пользователем Jellyfin (без похода на сервер). */
function signIn(bool $admin = false): JellyfinUser
{
    $user = new JellyfinUser(
        id: 'user-1',
        name: 'Анна',
        token: 'token-1',
        deviceId: 'device-1',
        isAdmin: $admin,
    );

    test()->actingAs($user);

    return $user;
}

/**
 * Элемент в том виде, как его отдаёт Jellyfin.
 *
 * @param  array<string, mixed>  $attributes
 * @return array<string, mixed>
 */
function jfItem(string $id, string $type = 'Movie', array $attributes = []): array
{
    return array_merge([
        'Id' => $id,
        'Name' => "Item {$id}",
        'Type' => $type,
        'IsFolder' => in_array($type, ['Series', 'Season', 'Folder', 'BoxSet', 'CollectionFolder'], true),
        'ProductionYear' => 2020,
        'RunTimeTicks' => 72_000_000_000,
        'ImageTags' => ['Primary' => "tag-{$id}"],
        'BackdropImageTags' => [],
        'UserData' => ['Played' => false, 'IsFavorite' => false, 'PlaybackPositionTicks' => 0],
    ], $attributes);
}

/**
 * @param  list<array<string, mixed>>  $items
 * @return array{Items: list<array<string, mixed>>, TotalRecordCount: int}
 */
function jfList(array $items, ?int $total = null): array
{
    return ['Items' => $items, 'TotalRecordCount' => $total ?? count($items)];
}

/** Медиатеки пользователя: фильмы, сериалы, «прочее видео» и музыка. */
function jfViews(): array
{
    return jfList([
        jfItem('lib-movies', 'CollectionFolder', ['Name' => 'Фильмы', 'CollectionType' => 'movies']),
        jfItem('lib-shows', 'CollectionFolder', ['Name' => 'Сериалы', 'CollectionType' => 'tvshows']),
        jfItem('lib-sport', 'CollectionFolder', ['Name' => 'Спорт']),
        jfItem('lib-music', 'CollectionFolder', ['Name' => 'Музыка', 'CollectionType' => 'music']),
    ]);
}

/**
 * Заголовки запроса Inertia (переход внутри клиента) с актуальной версией
 * ассетов — иначе сервер ответит 409 «перезагрузи страницу».
 *
 * @return array<string, string>
 */
function inertiaHeaders(): array
{
    return [
        'X-Inertia' => 'true',
        'X-Inertia-Version' => (string) app(HandleInertiaRequests::class)->version(Request::create('/')),
    ];
}
