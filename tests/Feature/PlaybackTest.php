<?php

use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Http;
use Inertia\Testing\AssertableInertia as Assert;

beforeEach(function (): void {
    signIn();
});

/** Ответ /PlaybackInfo: один источник с дорожками. */
function jfPlaybackInfo(array $source): array
{
    return [
        'PlaySessionId' => 'session-1',
        'MediaSources' => [array_merge([
            'Id' => 'source-1',
            'Container' => 'mp4',
            'ETag' => 'etag-1',
            'SupportsDirectPlay' => true,
            'DefaultAudioStreamIndex' => 1,
            'MediaStreams' => [
                ['Index' => 0, 'Type' => 'Video', 'Codec' => 'hevc'],
                ['Index' => 1, 'Type' => 'Audio', 'DisplayTitle' => 'Русский - AAC 5.1', 'Language' => 'rus'],
                ['Index' => 2, 'Type' => 'Subtitle', 'DisplayTitle' => 'Русский (SRT)', 'DeliveryMethod' => 'External', 'DeliveryUrl' => '/Videos/movie-1/source-1/Subtitles/2/0/Stream.vtt'],
                ['Index' => 3, 'Type' => 'Subtitle', 'DisplayTitle' => 'English (PGS)', 'DeliveryMethod' => 'Encode'],
            ],
        ], $source)],
    ];
}

const BROWSER = [
    'codecs' => ['h264', 'hevc', 'aac', 'ac3', 'unknown'],
    'containers' => ['mp4'],
    'dolbyVision' => false,
];

it('opens the player where the user stopped', function (): void {
    Http::fake([
        'jellyfin.test/Items/movie-1*' => Http::response(jfItem('movie-1', 'Movie', [
            'UserData' => ['PlaybackPositionTicks' => 12_000_000_000],
            'Trickplay' => ['source-1' => [
                '640' => ['Width' => 640, 'Height' => 360, 'TileWidth' => 10, 'TileHeight' => 10, 'ThumbnailCount' => 500, 'Interval' => 10000],
                '320' => ['Width' => 320, 'Height' => 180, 'TileWidth' => 10, 'TileHeight' => 10, 'ThumbnailCount' => 500, 'Interval' => 10000],
            ]],
        ])),
        'jellyfin.test/MediaSegments/*' => Http::response(jfList([
            ['Type' => 'Intro', 'StartTicks' => 300_000_000, 'EndTicks' => 900_000_000],
            ['Type' => 'Commercial', 'StartTicks' => 0, 'EndTicks' => 10],
        ])),
        'jellyfin.test/UserViews*' => Http::response(jfViews()),
    ]);

    $this->get('/watch/movie-1')
        ->assertInertia(fn (Assert $page) => $page
            ->component('watch')
            ->where('startAt', 1200)
            ->where('next', null)
            ->where('segments', [['type' => 'Intro', 'start' => 30, 'end' => 90]])
            // Самые мелкие превью: их грузят пачками при перемотке.
            ->where('trickplay.width', 320)
            ->where('trickplay.interval', 10)
            ->where('trickplay.url', 'https://media.test/Videos/movie-1/Trickplay/320/{index}.jpg?mediaSourceId=source-1&ApiKey=token-1'));

    $this->get('/watch/movie-1?t=0')->assertInertia(fn (Assert $page) => $page->where('startAt', 0));
});

it('plays the next episode across a season boundary', function (): void {
    Http::fake([
        'jellyfin.test/Items/ep-1-2*' => Http::response(jfItem('ep-1-2', 'Episode', ['SeriesId' => 'series-1'])),
        'jellyfin.test/MediaSegments/*' => Http::response(jfList([])),
        'jellyfin.test/Shows/series-1/Episodes*' => Http::response(jfList([
            jfItem('ep-1-1', 'Episode'),
            jfItem('ep-1-2', 'Episode'),
            jfItem('ep-2-1', 'Episode', ['ParentIndexNumber' => 2, 'IndexNumber' => 1]),
        ])),
        'jellyfin.test/UserViews*' => Http::response(jfViews()),
    ]);

    $this->get('/watch/ep-1-2')
        ->assertInertia(fn (Assert $page) => $page->where('next.id', 'ep-2-1'));
});

it('starts a series from its next episode', function (): void {
    Http::fake([
        'jellyfin.test/Items/series-1*' => Http::response(jfItem('series-1', 'Series')),
        'jellyfin.test/Shows/NextUp*' => Http::response(jfList([jfItem('ep-3', 'Episode')])),
    ]);

    $this->get('/watch/series-1')->assertRedirect('/watch/ep-3');
});

it('plays the file as is when the browser can', function (): void {
    Http::fake(['jellyfin.test/Items/movie-1/PlaybackInfo' => Http::response(jfPlaybackInfo([]))]);

    $this->postJson('/watch/movie-1/playback', [...BROWSER, 'startAt' => 600])
        ->assertOk()
        ->assertJson([
            'method' => 'DirectPlay',
            'hls' => false,
            'url' => 'https://media.test/Videos/movie-1/stream?static=true&mediaSourceId=source-1&deviceId=device-1&playSessionId=session-1&tag=etag-1&ApiKey=token-1',
            'audioIndex' => 1,
            'subtitleTracks' => [
                ['index' => 2, 'url' => 'https://media.test/Videos/movie-1/source-1/Subtitles/2/0/Stream.vtt?ApiKey=token-1'],
                // Картиночные — без ссылки: их только вшивать.
                ['index' => 3, 'url' => null],
            ],
        ]);

    Http::assertSent(function (Request $request): bool {
        $profile = $request['DeviceProfile'];
        $transcoding = $profile['TranscodingProfiles'][0];

        return $request['UserId'] === 'user-1'
            && $request['MediaSourceId'] === 'movie-1'
            && $request['StartTimeTicks'] === 6_000_000_000
            // Без явного -1 сервер начал бы вшивать субтитры по умолчанию.
            && $request['SubtitleStreamIndex'] === -1
            && $request['EnableDirectPlay'] === true
            && $profile['DirectPlayProfiles'][0]['VideoCodec'] === 'h264,hevc'
            && $profile['DirectPlayProfiles'][0]['AudioCodec'] === 'aac,ac3'
            // HEVC первым: исходник в HEVC копируется, а не пережимается.
            && $transcoding['VideoCodec'] === 'hevc,h264'
            && $transcoding['Protocol'] === 'hls'
            && ! str_contains($profile['CodecProfiles'][1]['Conditions'][0]['Value'], 'DOVI|');
    });
});

it('remuxes into HLS when the container does not fit', function (): void {
    Http::fake(['jellyfin.test/Items/movie-1/PlaybackInfo' => Http::response(jfPlaybackInfo([
        'Container' => 'mkv',
        'SupportsDirectPlay' => false,
        'TranscodingUrl' => '/videos/movie-1/master.m3u8?VideoCodec=hevc,h264&ApiKey=token-1&TranscodeReasons=ContainerNotSupported,AudioCodecNotSupported',
    ]))]);

    $this->postJson('/watch/movie-1/playback', [...BROWSER, 'directPlay' => false])
        ->assertOk()
        ->assertJson([
            'method' => 'Transcode',
            'hls' => true,
            'transcodesVideo' => false,
            'reasons' => ['ContainerNotSupported', 'AudioCodecNotSupported'],
            'url' => 'https://media.test/videos/movie-1/master.m3u8?VideoCodec=hevc,h264&ApiKey=token-1&TranscodeReasons=ContainerNotSupported,AudioCodecNotSupported',
        ]);

    Http::assertSent(fn (Request $request) => $request['EnableDirectPlay'] === false);
});

it('burns in picture subtitles only on request', function (): void {
    Http::fake(['jellyfin.test/Items/movie-1/PlaybackInfo' => Http::response(jfPlaybackInfo([
        'SupportsDirectPlay' => false,
        'DefaultSubtitleStreamIndex' => 3,
        'TranscodingUrl' => '/videos/movie-1/master.m3u8?TranscodeReasons=SubtitleCodecNotSupported',
    ]))]);

    $this->postJson('/watch/movie-1/playback', [...BROWSER, 'burnSubtitleIndex' => 3])
        ->assertJson(['subtitleIndex' => 3, 'transcodesVideo' => true]);

    Http::assertSent(fn (Request $request) => $request['SubtitleStreamIndex'] === 3);
});

it('turns on default subtitles only when they are text', function (): void {
    Http::fake(['jellyfin.test/Items/*/PlaybackInfo' => Http::sequence()
        ->push(jfPlaybackInfo(['DefaultSubtitleStreamIndex' => 2]))
        ->push(jfPlaybackInfo(['DefaultSubtitleStreamIndex' => 3])),
    ]);

    $this->postJson('/watch/movie-1/playback', BROWSER)->assertJson(['subtitleIndex' => 2]);
    $this->postJson('/watch/movie-1/playback', BROWSER)->assertJson(['subtitleIndex' => null]);
});

it('asks for a remux when the browser cannot switch audio tracks in a file', function (): void {
    Http::fake(['jellyfin.test/Items/movie-1/PlaybackInfo' => Http::response(jfPlaybackInfo([
        'SupportsDirectPlay' => false,
        'TranscodingUrl' => '/videos/movie-1/master.m3u8?AudioStreamIndex=4&VideoCodec=hevc&TranscodeReasons=SecondaryAudioNotSupported',
    ]))]);

    // Звучит дорожка из адреса потока, а не умолчание файла (1).
    $this->postJson('/watch/movie-1/playback', [...BROWSER, 'audioStreamIndex' => 4])
        ->assertJson(['method' => 'Transcode', 'audioIndex' => 4, 'transcodesVideo' => false]);

    Http::assertSent(fn (Request $request) => $request['AudioStreamIndex'] === 4
        // Без названного источника Jellyfin молча игнорирует выбранную дорожку.
        && $request['MediaSourceId'] === 'movie-1'
        && collect($request['DeviceProfile']['CodecProfiles'])->contains(
            fn (array $profile) => $profile['Type'] === 'VideoAudio'
                && $profile['Conditions'][0]['Property'] === 'IsSecondaryAudio',
        ));
});

it('names the current media source so Jellyfin applies the chosen tracks', function (): void {
    Http::fake(['jellyfin.test/Items/movie-1/PlaybackInfo' => Http::response(jfPlaybackInfo([]))]);

    $this->postJson('/watch/movie-1/playback', [...BROWSER, 'mediaSourceId' => 'version-4k', 'audioStreamIndex' => 2])->assertOk();

    Http::assertSent(fn (Request $request) => $request['MediaSourceId'] === 'version-4k'
        && $request['AudioStreamIndex'] === 2);
});

it('lets Safari play other audio tracks straight from the file', function (): void {
    Http::fake(['jellyfin.test/Items/movie-1/PlaybackInfo' => Http::response(jfPlaybackInfo([]))]);

    $this->postJson('/watch/movie-1/playback', [...BROWSER, 'audioTrackSwitching' => true])->assertOk();

    Http::assertSent(fn (Request $request) => collect($request['DeviceProfile']['CodecProfiles'])
        ->doesntContain(fn (array $profile) => $profile['Type'] === 'VideoAudio'));
});

it('explains when the server cannot play the file', function (): void {
    Http::fake(['jellyfin.test/Items/movie-1/PlaybackInfo' => Http::response([
        'MediaSources' => [],
        'ErrorCode' => 'NotAllowed',
    ])]);

    $this->postJson('/watch/movie-1/playback', BROWSER)
        ->assertUnprocessable()
        ->assertJson(['message' => 'Воспроизведение запрещено для вашей учётной записи.']);
});

it('answers the player with 401 when the session is gone', function (): void {
    Http::fake(['jellyfin.test/*' => Http::response(null, 401)]);

    $this->postJson('/watch/movie-1/playback', BROWSER)->assertUnauthorized();
    $this->assertGuest();
});

it('reports playback progress in ticks', function (): void {
    Http::fake(['jellyfin.test/Sessions/Playing/Progress' => Http::response(null, 204)]);

    $this->postJson('/playback/progress', [
        'itemId' => 'movie-1',
        'mediaSourceId' => 'source-1',
        'playSessionId' => 'session-1',
        'position' => 61.5,
        'paused' => true,
        'playMethod' => 'Transcode',
        'audioStreamIndex' => 1,
    ])->assertNoContent();

    Http::assertSent(fn (Request $request) => $request['PositionTicks'] === 615_000_000
        && $request['IsPaused'] === true
        && $request['PlayMethod'] === 'Transcode'
        && $request['SubtitleStreamIndex'] === -1);
});

it('rejects unknown playback events', function (): void {
    $this->postJson('/playback/rewind', [])->assertNotFound();
});
