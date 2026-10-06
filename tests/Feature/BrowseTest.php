<?php

use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Http;
use Inertia\Testing\AssertableInertia as Assert;

beforeEach(function (): void {
    signIn();
});

it('renders the home page with the hero, continue watching and next up', function (): void {
    Http::fake([
        'jellyfin.test/Items?*' => Http::response(jfList([
            jfItem('movie-1', 'Movie', ['BackdropImageTags' => ['bd'], 'Overview' => 'Про кино']),
        ])),
        'jellyfin.test/UserItems/Resume*' => Http::response(jfList([
            jfItem('movie-2', 'Movie', ['UserData' => ['PlayedPercentage' => 42.5, 'Played' => false]]),
        ])),
        'jellyfin.test/Shows/NextUp*' => Http::response(jfList([
            jfItem('ep-1', 'Episode', ['SeriesName' => 'Сериал', 'ParentIndexNumber' => 1, 'IndexNumber' => 3]),
        ])),
        'jellyfin.test/UserViews*' => Http::response(jfViews()),
    ]);

    $this->get('/')
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('home')
            ->has('hero', 1)
            ->where('hero.0.backdrop', 'https://media.test/Items/movie-1/Images/Backdrop?tag=bd&maxWidth=1920&quality=90')
            ->where('resume.0.progress', 42.5)
            ->where('nextUp.0.seriesName', 'Сериал')
            // Музыка — во встроенном клиенте.
            ->where('libraries.3.externalUrl', 'https://media.test/web/#/music?topParentId=lib-music&collectionType=music')
            ->missing('shelves'));
});

it('loads the library shelves after the first paint', function (): void {
    Http::fake([
        'jellyfin.test/UserViews*' => Http::response(jfViews()),
        'jellyfin.test/Items/Latest*' => Http::response([jfItem('movie-1')]),
    ]);

    $this->get('/', [
        ...inertiaHeaders(),
        'X-Inertia-Partial-Component' => 'home',
        'X-Inertia-Partial-Data' => 'shelves',
    ])->assertJsonPath('props.shelves.0.library.name', 'Фильмы')
        // Три медиатеки свои, музыка — нет.
        ->assertJsonCount(3, 'props.shelves');
});

it('pages through a movie library with sorting and filters', function (): void {
    Http::fake([
        'jellyfin.test/Items/lib-movies*' => Http::response(jfItem('lib-movies', 'CollectionFolder', ['CollectionType' => 'movies'])),
        'jellyfin.test/Items?*' => Http::response(jfList([jfItem('movie-1'), jfItem('movie-2')], total: 100)),
        'jellyfin.test/Genres*' => Http::response(jfList([['Name' => 'Драма'], ['Name' => 'Комедия']])),
        'jellyfin.test/UserViews*' => Http::response(jfViews()),
    ]);

    $this->get('/libraries/lib-movies?sort=rating&unwatched=1&genre='.rawurlencode('Драма').'&page=2')
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('library')
            ->has('items.data', 2)
            ->where('filters.sort', 'rating')
            ->where('filters.unwatched', true)
            ->where('genres', ['Драма', 'Комедия']));

    Http::assertSent(function (Request $request): bool {
        parse_str((string) parse_url($request->url(), PHP_URL_QUERY), $query);

        return str_contains($request->url(), '/Items?')
            && $query['includeItemTypes'] === 'Movie'
            && $query['recursive'] === 'true'
            && $query['sortBy'] === 'CommunityRating,SortName'
            && $query['filters'] === 'IsUnplayed'
            && $query['genres'] === 'Драма'
            && $query['startIndex'] === '48';
    });
});

it('browses other-video libraries by folder', function (): void {
    Http::fake([
        'jellyfin.test/Items/lib-sport*' => Http::response(jfItem('lib-sport', 'CollectionFolder')),
        'jellyfin.test/Items?*' => Http::response(jfList([jfItem('season-2024', 'Folder')])),
        'jellyfin.test/UserViews*' => Http::response(jfViews()),
    ]);

    $this->get('/libraries/lib-sport')
        ->assertInertia(fn (Assert $page) => $page
            ->where('library.kind', 'folders')
            ->where('filters.sort', 'name')
            ->where('genres', []));

    Http::assertSent(fn (Request $request) => str_contains($request->url(), 'recursive=false')
        && str_contains($request->url(), 'sortBy=IsFolder%2CSortName'));
});

it('names the collections view in Russian', function (): void {
    Http::fake([
        'jellyfin.test/Items?*' => Http::response(jfList([])),
        'jellyfin.test/UserItems/Resume*' => Http::response(jfList([])),
        'jellyfin.test/Shows/NextUp*' => Http::response(jfList([])),
        'jellyfin.test/UserViews*' => Http::response(jfList([
            jfItem('lib-collections', 'CollectionFolder', ['Name' => 'Collections', 'CollectionType' => 'boxsets']),
            jfItem('lib-movies', 'CollectionFolder', ['Name' => 'Фильмы', 'CollectionType' => 'movies']),
        ])),
    ]);

    $this->get('/')->assertInertia(fn (Assert $page) => $page
        ->where('libraries.0.name', 'Коллекции')
        ->where('libraries.1.name', 'Фильмы'));
});

it('opens music libraries in the built-in client', function (): void {
    Http::fake([
        'jellyfin.test/Items/lib-music*' => Http::response(jfItem('lib-music', 'CollectionFolder', ['CollectionType' => 'music'])),
    ]);

    $this->get('/libraries/lib-music', inertiaHeaders())
        ->assertStatus(409)
        ->assertHeader('X-Inertia-Location', 'https://media.test/web/#/music?topParentId=lib-music&collectionType=music');
});

it('opens the season with the next episode on a series page', function (): void {
    Http::fake([
        'jellyfin.test/Items/series-1/Similar*' => Http::response(jfList([])),
        'jellyfin.test/Items/series-1*' => Http::response(jfItem('series-1', 'Series', ['Status' => 'Continuing'])),
        'jellyfin.test/Shows/series-1/Seasons*' => Http::response(jfList([
            jfItem('season-1', 'Season', ['UserData' => ['Played' => true]]),
            jfItem('season-2', 'Season'),
        ])),
        'jellyfin.test/Shows/NextUp*' => Http::response(jfList([
            jfItem('ep-2-1', 'Episode', ['SeasonId' => 'season-2', 'SeriesId' => 'series-1']),
        ])),
        'jellyfin.test/Shows/series-1/Episodes*' => Http::response(jfList([jfItem('ep-2-1', 'Episode')])),
        'jellyfin.test/UserViews*' => Http::response(jfViews()),
    ]);

    $this->get('/items/series-1')
        ->assertInertia(fn (Assert $page) => $page
            ->component('series')
            ->where('seasonId', 'season-2')
            ->where('nextUp.id', 'ep-2-1')
            ->has('episodes', 1));

    Http::assertSent(fn (Request $request) => str_contains($request->url(), '/Episodes?')
        && str_contains($request->url(), 'seasonId=season-2'));
});

it('redirects a season to its series', function (): void {
    Http::fake([
        'jellyfin.test/Items/season-2*' => Http::response(jfItem('season-2', 'Season', ['SeriesId' => 'series-1'])),
    ]);

    $this->get('/items/season-2')->assertRedirect('/items/series-1?season=season-2');
});

it('shows a movie with its cast, file details and similar titles', function (): void {
    Http::fake([
        'jellyfin.test/Items/movie-1/Similar*' => Http::response(jfList([jfItem('movie-2')])),
        'jellyfin.test/Items/movie-1*' => Http::response(jfItem('movie-1', 'Movie', [
            'People' => [
                ['Id' => 'p-1', 'Name' => 'Актёр', 'Type' => 'Actor', 'Role' => 'Герой'],
                ['Id' => 'p-2', 'Name' => 'Режиссёр', 'Type' => 'Director'],
            ],
            'ProviderIds' => ['Imdb' => 'tt0133093'],
            'MediaSources' => [[
                'Container' => 'mkv',
                'Size' => 50_000_000_000,
                'MediaStreams' => [
                    ['Type' => 'Video', 'Codec' => 'hevc', 'Width' => 3840, 'VideoRangeType' => 'DOVIWithHDR10'],
                    ['Type' => 'Audio', 'DisplayTitle' => 'Русский - Dolby TrueHD 7.1', 'IsDefault' => true],
                    ['Type' => 'Audio', 'DisplayTitle' => 'English - DTS 5.1'],
                ],
            ]],
            'UserData' => ['PlaybackPositionTicks' => 6_000_000_000, 'Played' => false],
        ])),
        'jellyfin.test/UserViews*' => Http::response(jfViews()),
    ]);

    $this->get('/items/movie-1')
        ->assertInertia(fn (Assert $page) => $page
            ->component('item')
            ->where('item.resumeAt', 600)
            ->where('item.people.0.role', 'Режиссёр')
            ->where('item.people.1.role', 'Герой')
            ->where('item.media.resolution', '4K')
            ->where('item.media.hdr', 'Dolby Vision')
            ->where('item.media.audioTracks', 2)
            ->where('item.links.0.label', 'IMDb')
            ->has('similar', 1));
});

it('searches titles, episodes and people', function (): void {
    Http::fake([
        'jellyfin.test/Items?*' => Http::sequence()
            ->push(jfList([jfItem('movie-1')]))
            ->push(jfList([])),
        'jellyfin.test/Persons*' => Http::response(jfList([jfItem('p-1', 'Person', ['IsFolder' => false])])),
        'jellyfin.test/UserViews*' => Http::response(jfViews()),
    ]);

    $this->get('/search?q='.urlencode('  матрица  '))
        ->assertInertia(fn (Assert $page) => $page
            ->component('search')
            ->where('query', 'матрица')
            ->has('titles', 1)
            ->has('people', 1));
});

it('marks items played and favorite', function (): void {
    Http::fake([
        'jellyfin.test/UserPlayedItems/*' => Http::response(['Played' => true]),
        'jellyfin.test/UserFavoriteItems/*' => Http::response(['IsFavorite' => false]),
    ]);

    $this->from('/items/movie-1')->post('/items/movie-1/played')->assertRedirect('/items/movie-1');
    $this->from('/items/movie-1')->delete('/items/movie-1/favorite')->assertRedirect('/items/movie-1');

    Http::assertSent(fn (Request $request) => $request->method() === 'POST'
        && str_contains($request->url(), '/UserPlayedItems/movie-1?userId=user-1'));
    Http::assertSent(fn (Request $request) => $request->method() === 'DELETE'
        && str_contains($request->url(), '/UserFavoriteItems/movie-1'));
});

it('shows a friendly page when Jellyfin is down', function (): void {
    Http::fake(['jellyfin.test/*' => Http::failedConnection()]);

    $this->get('/')
        ->assertInertia(fn (Assert $page) => $page
            ->component('error')
            ->where('status', 503));
});
