{{--
    Плеер облегчённой версии. Разметка — здесь, поведение — public/lite/player.js
    (тот же порядок, что у resources/js/components/player.tsx: поток спрашиваем
    из браузера с его кодеками, отчёты о просмотре, дорожки, серии).
--}}
@php
    use App\Lite\Format;
    use App\Lite\Icon;
    $isEpisode = $item['type'] === 'Episode' && $item['seriesId'] !== null;
    $title = $item['type'] === 'Episode' && $item['seriesName'] ? $item['seriesName'] : $item['name'];
    $subtitleLine = $item['type'] === 'Episode' ? implode(' · ', array_filter([Format::episodeLabel($item), $item['name']])) : null;
    $config = [
        'item' => [
            'id' => $item['id'],
            'name' => $item['name'],
            'seriesId' => $item['seriesId'],
            'seasonId' => $item['seasonId'],
            'isEpisode' => $isEpisode,
            'runtime' => $item['runtime'],
        ],
        'startAt' => $startAt,
        'next' => $next === null ? null : [
            'id' => $next['id'],
            'name' => $next['name'],
            'label' => Format::episodeLabel($next),
            'image' => $next['landscape'] ?? $next['poster'],
        ],
        'segments' => $segments,
        'trickplay' => $trickplay,
        'urls' => [
            'playback' => route('playback.store', $item['id']),
            'report' => url('playback'),
            'episodes' => $isEpisode ? route('series.episodes', $item['seriesId']) : null,
            'watch' => route('watch', '__ID__'),
            'back' => route('items.show', $item['seriesId'] ?? $item['id']),
        ],
    ];
    $icons = ['check', 'chevron-left', 'chevron-right', 'audio-lines', 'captions', 'gauge', 'info', 'play', 'rotate-ccw', 'x', 'fast-forward', 'rewind', 'pause', 'volume-2', 'volume-x'];
@endphp
@extends('lite.layouts.base')

@section('title', $item['type'] === 'Episode' && $item['seriesName'] ? $item['seriesName'].' — '.$item['name'] : $item['name'])
@section('body-class', 'body--player')

@section('body')
    <div class="player" data-player>
        <video class="player__video" playsinline webkit-playsinline preload="auto"></video>

        {{-- Застывший кадр, пока готовится поток с другой дорожкой. --}}
        <canvas class="player__snapshot" data-snapshot></canvas>
        <div class="player__center player__switching" data-switching hidden>
            <div class="pill">{{ Icon::svg('loader-circle', 'spin') }} <span data-switching-text></span></div>
        </div>

        <div class="player__cue" data-cue hidden><p class="player__cue-text" data-cue-text></p></div>

        <div class="player__bezel" data-bezel hidden>
            <div class="player__bezel-circle" data-bezel-circle><span data-bezel-icon></span><span class="player__bezel-text" data-bezel-text></span></div>
        </div>

        <div class="player__center" data-loading>
            <div class="player__loading">
                {{ Icon::svg('loader-circle', 'spin icon--huge') }}
                <p class="player__note" data-transcode-note hidden>Сервер готовит видео…</p>
            </div>
        </div>

        <div class="player__center player__center--interactive" data-blocked hidden>
            <button type="button" class="player__big-play" data-action="start" aria-label="Смотреть">{{ Icon::svg('play', 'icon--huge', fill: true) }}</button>
        </div>

        {{-- Верх: назад и название (ведёт на фильм или сериал), строка серии — на серию. --}}
        <div class="player__top" data-chrome>
            <button type="button" class="ctrl ctrl--lg" data-action="back" aria-label="Назад">{{ Icon::svg('arrow-left', 'icon--lg') }}</button>
            <div class="player__titles">
                <a href="{{ route('items.show', $isEpisode ? $item['seriesId'] : $item['id']) }}" class="player__title">
                    <span class="truncate">{{ $title }}</span> {{ Icon::svg('chevron-right', 'player__title-chevron') }}
                </a>
                @if ($subtitleLine)
                    <a href="{{ route('items.show', $item['id']) }}" class="player__subtitle truncate">{{ $subtitleLine }}</a>
                @endif
            </div>
            <div class="player__method" data-method hidden></div>
        </div>

        <div class="player__resumed" data-resumed hidden>
            <span>Продолжено с <span data-resumed-at></span></span>
            <button type="button" class="player__resumed-btn" data-action="restart">{{ Icon::svg('rotate-ccw', 'icon--xs') }} С начала</button>
        </div>

        {{-- Пропуск заставки / следующая серия — над панелью. --}}
        <div class="player__offer" data-offer hidden>
            <button type="button" class="offer-btn" data-action="skip" hidden>{{ Icon::svg('skip-forward', 'icon--sm') }} <span data-skip-text></span></button>
            <button type="button" class="offer-btn offer-btn--next" data-action="next" hidden>{{ Icon::svg('skip-forward', 'icon--sm', fill: true) }} Следующая серия</button>
        </div>

        {{-- Панель управления. --}}
        <div class="player__bottom" data-chrome data-controls>
            <div class="progress" data-progress role="slider" aria-label="Перемотка">
                <div class="progress__track">
                    <div class="progress__buffered" data-buffered></div>
                    <div data-segments></div>
                    <div class="progress__played" data-played></div>
                    <div class="progress__thumb" data-thumb></div>
                </div>
                <div class="progress__tip" data-tip hidden>
                    <div class="progress__frame" data-frame hidden></div>
                    <span class="progress__time" data-tip-time></span>
                </div>
            </div>
            <div class="player__row">
                <button type="button" class="ctrl" data-action="toggle" aria-label="Смотреть / пауза">
                    <span data-icon-play>{{ Icon::svg('play', '', fill: true) }}</span>
                    <span data-icon-pause hidden>{{ Icon::svg('pause', '', fill: true) }}</span>
                    <span data-icon-replay hidden>{{ Icon::svg('rotate-ccw') }}</span>
                </button>
                <button type="button" class="ctrl" data-action="rewind" aria-label="Назад на 10 с">{{ Icon::svg('rewind', '', fill: true) }}</button>
                <button type="button" class="ctrl" data-action="forward" aria-label="Вперёд на 10 с">{{ Icon::svg('fast-forward', '', fill: true) }}</button>
                @if ($next)
                    <button type="button" class="ctrl" data-action="next" aria-label="Следующая серия">{{ Icon::svg('skip-forward', '', fill: true) }}</button>
                @endif
                <button type="button" class="ctrl" data-action="mute" aria-label="Звук">
                    <span data-icon-volume>{{ Icon::svg('volume-2') }}</span>
                    <span data-icon-muted hidden>{{ Icon::svg('volume-x') }}</span>
                </button>
                <div class="player__time"><span data-current>0:00</span><span class="player__duration"> / <span data-duration>{{ Format::duration($item['runtime']) }}</span></span></div>
                <div class="player__spacer"></div>
                <button type="button" class="ctrl ctrl--subs" data-action="subtitles" aria-label="Субтитры" hidden>{{ Icon::svg('captions') }}</button>
                @if ($isEpisode)
                    <button type="button" class="ctrl" data-action="episodes" data-episodes-toggle aria-label="Серии">{{ Icon::svg('list-video') }}</button>
                @endif
                <button type="button" class="ctrl" data-action="settings" data-settings-toggle aria-label="Настройки" hidden>{{ Icon::svg('settings') }}</button>
                <button type="button" class="ctrl" data-action="pip" aria-label="Картинка в картинке" hidden>{{ Icon::svg('picture-in-picture-2') }}</button>
                <button type="button" class="ctrl" data-action="airplay" aria-label="AirPlay" hidden>{{ Icon::svg('airplay') }}</button>
                <button type="button" class="ctrl" data-action="fullscreen" aria-label="Во весь экран">{{ Icon::svg('maximize') }}</button>
            </div>
        </div>

        <div class="menu" data-settings hidden></div>

        @if ($isEpisode)
            <div class="episodes-panel" data-episodes-panel role="dialog" aria-label="Серии" hidden>
                <div class="episodes-panel__head">
                    <div class="episodes-panel__heading">
                        <p class="episodes-panel__kicker">Серии</p>
                        <a href="{{ route('items.show', $item['seriesId']) }}" class="episodes-panel__series">
                            <span class="truncate">{{ $item['seriesName'] ?? 'Сериал' }}</span> {{ Icon::svg('chevron-right', 'player__title-chevron') }}
                        </a>
                    </div>
                    <button type="button" class="ctrl" data-action="close-episodes" aria-label="Закрыть">{{ Icon::svg('x') }}</button>
                </div>
                <div class="episodes-panel__tabs" data-season-tabs hidden></div>
                <div class="episodes-panel__list" data-episode-list></div>
            </div>
        @endif

        <div class="player__overlay" data-error hidden>
            <p class="player__overlay-title">Не удалось воспроизвести</p>
            <p class="player__overlay-text" data-error-text></p>
            <div class="actions actions--center">
                <button type="button" class="btn btn--primary" data-action="retry">{{ Icon::svg('rotate-ccw', 'icon--sm') }} Ещё раз</button>
                <a href="{{ $item['builtInUrl'] }}" target="_blank" rel="noreferrer" class="btn btn--secondary">Открыть в стандартном клиенте</a>
            </div>
        </div>

        @if ($next)
            <div class="player__overlay" data-countdown hidden>
                <p class="player__overlay-text">Следующая серия через <span data-countdown-value></span></p>
                <div class="countdown__next">
                    @if ($next['landscape'] ?? $next['poster'])
                        <img class="countdown__img" src="{{ $next['landscape'] ?? $next['poster'] }}" alt="">
                    @endif
                    <div class="countdown__info">
                        <p class="countdown__label">{{ Format::episodeLabel($next) }}</p>
                        <p class="countdown__name">{{ $next['name'] }}</p>
                    </div>
                </div>
                <div class="actions actions--center">
                    <button type="button" class="btn btn--secondary" data-action="cancel-next">{{ Icon::svg('x', 'icon--sm') }} Отмена</button>
                    <button type="button" class="btn btn--primary" data-action="next">{{ Icon::svg('skip-forward', 'icon--sm', fill: true) }} Смотреть</button>
                </div>
            </div>
        @endif

        {{-- Иконки для того, что player.js строит сам (меню, список серий). --}}
        <div hidden>
            @foreach ($icons as $icon)
                <span data-icon-template="{{ $icon }}">{{ Icon::svg($icon) }}</span>
            @endforeach
        </div>
    </div>
@endsection

@push('scripts')
    <script>window.LITE_PLAYER = @json($config);</script>
    <script src="{{ Format::asset('player.js') }}"></script>
@endpush
