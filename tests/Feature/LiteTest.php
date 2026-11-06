<?php

use App\Lite\Lite;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Testing\TestResponse;
use Tests\TestCase;

/** Запрос из старого браузера: с кукой облегчённой версии. */
function lite(): TestResponse|TestCase
{
    return test()->withUnencryptedCookie(Lite::COOKIE, '1');
}

it('sends old browsers to the lite version from the main page', function (): void {
    Http::fake(['jellyfin.test/*' => Http::failedConnection()]);

    // Проверка в основном шаблоне ставит куку, если браузер не тянет клиент.
    $this->get('/login')->assertOk()->assertSee("css.supports('color', 'color-mix(in srgb, red, red)')", false);
});

it('switches the lite version on and off', function (): void {
    $this->get('/lite/on')->assertRedirect('/')->assertPlainCookie(Lite::COOKIE, '1');
    $this->get('/lite/off')->assertRedirect('/')->assertPlainCookie(Lite::COOKIE, '0');
});

it('renders the login page without React', function (): void {
    Http::fake([
        'jellyfin.test/System/Info/Public' => Http::response(['ServerName' => 'homeserver']),
        'jellyfin.test/QuickConnect/Enabled' => Http::response('true', 200, ['Content-Type' => 'application/json']),
    ]);

    lite()->get('/login')
        ->assertOk()
        ->assertSee('/lite/lite.css', false)
        ->assertDontSee('/build/', false)
        ->assertSee('homeserver')
        ->assertSee('name="password"', false)
        ->assertSee('Войти по коду с другого устройства');
});

it('shows form errors on the lite login page', function (): void {
    Http::fake([
        'jellyfin.test/Users/AuthenticateByName' => Http::response(null, 401),
        'jellyfin.test/System/Info/Public' => Http::response(['ServerName' => 'homeserver']),
        'jellyfin.test/QuickConnect/Enabled' => Http::response('false', 200, ['Content-Type' => 'application/json']),
    ]);

    lite()->from('/login')->post('/login', ['username' => 'anna', 'password' => 'wrong'])->assertRedirect('/login');

    lite()->get('/login')
        ->assertSee('Неверное имя пользователя или пароль.')
        ->assertSee('value="anna"', false);
});

it('shows the quick connect code and polls for approval', function (): void {
    Http::fake([
        'jellyfin.test/QuickConnect/Initiate' => Http::response(['Code' => '123456', 'Secret' => 'secret-1']),
        'jellyfin.test/System/Info/Public' => Http::response(['ServerName' => 'homeserver']),
        'jellyfin.test/QuickConnect/Enabled' => Http::response('true', 200, ['Content-Type' => 'application/json']),
    ]);

    lite()->from('/login')->post('/login/quick-connect')->assertRedirect('/login');

    lite()->get('/login')
        ->assertSee('data-quick-connect="'.route('login.quick-connect.check').'"', false)
        ->assertSeeInOrder(['qc__digit">1', 'qc__digit">6'], false);
});

describe('signed in', function (): void {
    beforeEach(function (): void {
        signIn();
    });

    it('renders the home page with the shelves the main client defers', function (): void {
        Http::fake([
            'jellyfin.test/Items/Latest*' => Http::response([jfItem('movie-3', 'Movie', ['Name' => 'Новинка'])]),
            'jellyfin.test/Items?*' => Http::response(jfList([
                jfItem('movie-1', 'Movie', ['Name' => 'Витрина', 'BackdropImageTags' => ['bd'], 'Overview' => 'Про кино']),
            ])),
            'jellyfin.test/UserItems/Resume*' => Http::response(jfList([
                jfItem('movie-2', 'Movie', ['Name' => 'Недосмотренное', 'UserData' => ['PlayedPercentage' => 42.5, 'Played' => false]]),
            ])),
            'jellyfin.test/Shows/NextUp*' => Http::response(jfList([])),
            'jellyfin.test/UserViews*' => Http::response(jfViews()),
        ]);

        lite()->get('/')
            ->assertOk()
            ->assertSee('Витрина')
            ->assertSee('Продолжить просмотр')
            // Отметки — обычными формами, без JavaScript.
            ->assertSee('action="'.route('items.resume.destroy', 'movie-2').'"', false)
            // «Новое в …» — сразу, а не после первой отрисовки.
            ->assertSee('Новое: Фильмы')
            ->assertSee('Новинка')
            ->assertSee('Во встроенном клиенте:');
    });

    it('pages through a library with a link to the next page', function (): void {
        Http::fake([
            'jellyfin.test/Items/lib-movies*' => Http::response(jfItem('lib-movies', 'CollectionFolder', ['CollectionType' => 'movies', 'Name' => 'Фильмы'])),
            'jellyfin.test/Items?*' => Http::response(jfList([jfItem('movie-1', 'Movie', ['Name' => 'Первый'])], total: 100)),
            'jellyfin.test/Genres*' => Http::response(jfList([['Name' => 'Драма']])),
            'jellyfin.test/UserViews*' => Http::response(jfViews()),
        ]);

        lite()->get('/libraries/lib-movies?sort=name&genre='.urlencode('Драма'))
            ->assertOk()
            ->assertSee('Первый')
            ->assertSee('data-scroll-grid', false)
            ->assertSee('page=2', false)
            ->assertSee('<option value="name" selected>По названию</option>', false)
            ->assertSee('<option value="Драма" selected>Драма</option>', false);
    });

    it('shows a series with seasons and episodes', function (): void {
        Http::fake([
            'jellyfin.test/Items/series-1/Similar*' => Http::response(jfList([])),
            'jellyfin.test/Items/series-1*' => Http::response(jfItem('series-1', 'Series', ['Name' => 'Сериал', 'ChildCount' => 2])),
            'jellyfin.test/Shows/series-1/Seasons*' => Http::response(jfList([
                jfItem('season-1', 'Season', ['Name' => 'Сезон 1', 'UserData' => ['Played' => true]]),
                jfItem('season-2', 'Season', ['Name' => 'Сезон 2']),
            ])),
            'jellyfin.test/Shows/NextUp*' => Http::response(jfList([
                jfItem('ep-2-1', 'Episode', ['Name' => 'Пилот', 'SeasonId' => 'season-2', 'SeriesId' => 'series-1', 'ParentIndexNumber' => 2, 'IndexNumber' => 1]),
            ])),
            'jellyfin.test/Shows/series-1/Episodes*' => Http::response(jfList([
                jfItem('ep-2-1', 'Episode', ['Name' => 'Пилот', 'IndexNumber' => 1, 'Overview' => 'Начало']),
            ])),
            'jellyfin.test/UserViews*' => Http::response(jfViews()),
        ]);

        lite()->get('/items/series-1')
            ->assertOk()
            ->assertSee('2 сезона')
            ->assertSee('Смотреть S2 · E1')
            ->assertSee('href="'.route('watch', 'ep-2-1').'"', false)
            ->assertSee('season=season-1', false)
            ->assertSee('Пилот');
    });

    it('shows a movie with actions, cast and file details', function (): void {
        Http::fake([
            'jellyfin.test/Items/movie-1/Similar*' => Http::response(jfList([jfItem('movie-2', 'Movie', ['Name' => 'Похожий'])])),
            'jellyfin.test/Items/movie-1*' => Http::response(jfItem('movie-1', 'Movie', [
                'Name' => 'Матрица',
                'People' => [['Id' => 'p-1', 'Name' => 'Киану Ривз', 'Type' => 'Actor', 'Role' => 'Нео']],
                'MediaSources' => [[
                    'Container' => 'mkv',
                    'Size' => 50_000_000_000,
                    'MediaStreams' => [
                        ['Type' => 'Video', 'Codec' => 'hevc', 'Width' => 3840],
                        ['Type' => 'Audio', 'DisplayTitle' => 'Русский - AAC 5.1', 'IsDefault' => true],
                    ],
                ]],
                'UserData' => ['PlaybackPositionTicks' => 6_000_000_000, 'Played' => false, 'IsFavorite' => true],
            ])),
            'jellyfin.test/UserViews*' => Http::response(jfViews()),
        ]);

        lite()->get('/items/movie-1')
            ->assertOk()
            ->assertSee('Продолжить с 10:00')
            ->assertSee('action="'.route('items.played.store', 'movie-1').'"', false)
            ->assertSee('action="'.route('items.favorite.destroy', 'movie-1').'"', false)
            ->assertSee('Нео')
            ->assertSee('Похожий')
            ->assertSee('MKV · 46,6 ГБ');
    });

    it('opens the player with everything player.js needs', function (): void {
        Http::fake([
            'jellyfin.test/Items/movie-1*' => Http::response(jfItem('movie-1', 'Movie', [
                'UserData' => ['PlaybackPositionTicks' => 12_000_000_000],
            ])),
            'jellyfin.test/MediaSegments/*' => Http::response(jfList([
                ['Type' => 'Intro', 'StartTicks' => 300_000_000, 'EndTicks' => 900_000_000],
            ])),
            'jellyfin.test/UserViews*' => Http::response(jfViews()),
        ]);

        lite()->get('/watch/movie-1')
            ->assertOk()
            ->assertSee('/lite/player.js', false)
            ->assertSee('"startAt":1200', false)
            ->assertSee('"segments":[{"type":"Intro","start":30,"end":90}]', false)
            ->assertSee('"playback":"'.str_replace('/', '\/', route('playback.store', 'movie-1')).'"', false);
    });

    it('limits the picture width for old iPads', function (): void {
        Http::fake(['jellyfin.test/Items/movie-1/PlaybackInfo' => Http::response([
            'PlaySessionId' => 'session-1',
            'MediaSources' => [['Id' => 'movie-1', 'SupportsDirectPlay' => true, 'MediaStreams' => []]],
        ])]);

        $this->postJson('/watch/movie-1/playback', [
            'codecs' => ['h264', 'aac'],
            'containers' => ['mp4'],
            'maxWidth' => 1920,
        ])->assertOk();

        Http::assertSent(fn (Request $request) => str_contains($request->url(), '/PlaybackInfo')
            && in_array([
                'Type' => 'Video',
                'Conditions' => [['Condition' => 'LessThanEqual', 'Property' => 'Width', 'Value' => '1920', 'IsRequired' => false]],
            ], $request->data()['DeviceProfile']['CodecProfiles'], true));
    });

    it('remuxes a file with several audio tracks so the old iPad gets only one', function (): void {
        $streams = [
            ['Type' => 'Video', 'Index' => 0, 'Codec' => 'h264'],
            ['Type' => 'Audio', 'Index' => 1, 'Codec' => 'aac'],
            ['Type' => 'Audio', 'Index' => 2, 'Codec' => 'aac'],
        ];
        Http::fake(['jellyfin.test/Items/movie-1/PlaybackInfo' => Http::sequence()
            ->push(['PlaySessionId' => 'session-1', 'MediaSources' => [['Id' => 'movie-1', 'SupportsDirectPlay' => true, 'MediaStreams' => $streams]]])
            ->push(['PlaySessionId' => 'session-2', 'MediaSources' => [[
                'Id' => 'movie-1',
                'SupportsDirectPlay' => false,
                'TranscodingUrl' => '/videos/movie-1/master.m3u8?AudioStreamIndex=1&TranscodeReasons=DirectPlayError',
                'MediaStreams' => $streams,
            ]]]),
        ]);

        $this->postJson('/watch/movie-1/playback', ['codecs' => ['h264', 'aac'], 'singleAudio' => true])
            ->assertOk()
            ->assertJsonPath('method', 'Transcode')
            ->assertJsonPath('playSessionId', 'session-2')
            ->assertJsonPath('audioIndex', 1);

        Http::assertSentCount(2);
        Http::assertSent(fn (Request $request) => ($request->data()['EnableDirectPlay'] ?? null) === false);
    });

    it('plays a file with one audio track as is', function (): void {
        Http::fake(['jellyfin.test/Items/movie-1/PlaybackInfo' => Http::response([
            'PlaySessionId' => 'session-1',
            'MediaSources' => [['Id' => 'movie-1', 'SupportsDirectPlay' => true, 'MediaStreams' => [
                ['Type' => 'Video', 'Index' => 0, 'Codec' => 'h264'],
                ['Type' => 'Audio', 'Index' => 1, 'Codec' => 'aac'],
            ]]],
        ])]);

        $this->postJson('/watch/movie-1/playback', ['codecs' => ['h264', 'aac'], 'singleAudio' => true])
            ->assertOk()
            ->assertJsonPath('method', 'DirectPlay');

        Http::assertSentCount(1);
    });

    it('searches and shows a person', function (): void {
        Http::fake([
            'jellyfin.test/Items/p-1*' => Http::response(jfItem('p-1', 'Person', ['Name' => 'Киану Ривз', 'IsFolder' => false, 'Overview' => 'Актёр'])),
            'jellyfin.test/Items?*' => Http::response(jfList([jfItem('movie-1', 'Movie', ['Name' => 'Матрица'])])),
            'jellyfin.test/Persons*' => Http::response(jfList([jfItem('p-1', 'Person', ['Name' => 'Киану Ривз', 'IsFolder' => false])])),
            'jellyfin.test/UserViews*' => Http::response(jfViews()),
        ]);

        lite()->get('/search?q='.urlencode('матрица'))
            ->assertOk()
            ->assertSee('value="матрица"', false)
            ->assertSee('Фильмы и сериалы')
            ->assertSee('Киану Ривз');

        lite()->get('/items/p-1')
            ->assertOk()
            ->assertSee('Киану Ривз')
            ->assertSee('Матрица');
    });

    it('shows a friendly page when Jellyfin is down', function (): void {
        Http::fake(['jellyfin.test/*' => Http::failedConnection()]);

        lite()->get('/')
            ->assertSee('Jellyfin недоступен')
            ->assertSee('/lite/lite.css', false);
    });

    it('shows a not found page', function (): void {
        Http::fake([
            'jellyfin.test/Items/missing*' => Http::response(null, 404),
            'jellyfin.test/UserViews*' => Http::response(jfViews()),
        ]);

        lite()->get('/items/missing')->assertNotFound()->assertSee('Не найдено');
    });
});
