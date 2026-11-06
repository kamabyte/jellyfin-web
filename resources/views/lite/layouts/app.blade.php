@php
    use App\Lite\Format;
    use App\Lite\Icon;
    $overlay = $overlay ?? false;
    $user = $auth['user'] ?? null;
    $libraries = $libraries ?? [];
    $own = array_values(array_filter($libraries, fn (array $library): bool => ! $library['externalUrl']));
    $external = array_values(array_filter($libraries, fn (array $library): bool => (bool) $library['externalUrl']));
    $path = '/'.ltrim(request()->path(), '/');
    $icons = ['movies' => 'film', 'tvshows' => 'tv', 'music' => 'music', 'musicvideos' => 'clapperboard', 'livetv' => 'radio', 'books' => 'book-open', 'playlists' => 'list-music', 'boxsets' => 'library'];
@endphp
@extends('lite.layouts.base')

@section('body')
    {{-- Шапка: на страницах с большим фоном прозрачная, пока не прокрутишь. --}}
    <header class="header {{ $overlay ? 'header--overlay' : 'header--solid' }}" @if ($overlay) data-overlay-header @endif>
        <div class="header__inner">
            <button type="button" class="icon-btn header__menu" data-drawer-open aria-label="Меню">
                {{ Icon::svg('menu') }}
            </button>
            <a href="{{ route('home') }}" class="logo" aria-label="На главную">
                <span class="logo__mark">{{ Icon::svg('play', 'icon--xs', fill: true) }}</span>
                <span class="logo__name">{{ $name ?? config('app.name') }}</span>
            </a>
            <nav class="nav" aria-label="Разделы">
                <a href="{{ route('home') }}" class="nav__link {{ $path === '/' ? 'nav__link--active' : '' }}">Главная</a>
                @foreach ($own as $library)
                    <a href="{{ route('libraries.show', $library['id']) }}"
                       class="nav__link {{ str_starts_with($path, '/libraries/'.$library['id']) ? 'nav__link--active' : '' }}">{{ $library['name'] }}</a>
                @endforeach
            </nav>
            <div class="header__end">
                <a href="{{ route('search') }}" class="icon-btn" aria-label="Поиск">{{ Icon::svg('search') }}</a>
                @if ($user && isset($builtIn))
                    <div class="dropdown" data-dropdown>
                        <button type="button" class="avatar" data-dropdown-toggle aria-label="Меню пользователя">
                            <span class="avatar__initials">{{ Format::initials($user['name']) }}</span>
                            @if ($user['avatar'])
                                <img class="avatar__img" src="{{ $user['avatar'] }}" alt="" onload="this.previousElementSibling.style.display='none'" onerror="this.parentNode.removeChild(this)">
                            @endif
                        </button>
                        <div class="dropdown__menu dropdown__menu--right">
                            <div class="dropdown__label">
                                <div class="dropdown__name">{{ $user['name'] }}</div>
                                <div class="dropdown__hint">{{ $user['isAdmin'] ? 'Администратор' : 'Пользователь' }}</div>
                            </div>
                            <div class="dropdown__sep"></div>
                            <a class="dropdown__item" href="{{ route('quick-connect') }}">{{ Icon::svg('monitor-smartphone', 'icon--sm') }} Подключить устройство</a>
                            <a class="dropdown__item" href="{{ $builtIn['preferences'] }}" target="_blank" rel="noreferrer">{{ Icon::svg('settings', 'icon--sm') }} Настройки профиля {{ Icon::svg('external-link', 'icon--xs dropdown__ext') }}</a>
                            @if ($builtIn['dashboard'])
                                <a class="dropdown__item" href="{{ $builtIn['dashboard'] }}" target="_blank" rel="noreferrer">{{ Icon::svg('layout-dashboard', 'icon--sm') }} Панель управления {{ Icon::svg('external-link', 'icon--xs dropdown__ext') }}</a>
                            @endif
                            <a class="dropdown__item" href="{{ $builtIn['home'] }}" target="_blank" rel="noreferrer">{{ Icon::svg('external-link', 'icon--sm') }} Стандартный клиент Jellyfin</a>
                            <div class="dropdown__sep"></div>
                            <form method="post" action="{{ route('logout') }}">
                                @csrf
                                <button type="submit" class="dropdown__item">{{ Icon::svg('log-out', 'icon--sm') }} Выйти</button>
                            </form>
                        </div>
                    </div>
                @endif
            </div>
        </div>
    </header>

    {{-- Боковое меню: все медиатеки, включая внешние. --}}
    <div class="drawer" data-drawer>
        <div class="drawer__backdrop" data-drawer-close></div>
        <nav class="drawer__panel" aria-label="Медиатеки">
            <div class="drawer__head">
                <span class="logo">
                    <span class="logo__mark">{{ Icon::svg('play', 'icon--xs', fill: true) }}</span>
                    <span class="logo__name">{{ $name ?? config('app.name') }}</span>
                </span>
                <button type="button" class="icon-btn" data-drawer-close aria-label="Закрыть">{{ Icon::svg('x') }}</button>
            </div>
            <a href="{{ route('home') }}" class="drawer__link">{{ Icon::svg('house') }} Главная</a>
            @foreach ($libraries as $library)
                @if ($library['externalUrl'])
                    <a href="{{ $library['externalUrl'] }}" target="_blank" rel="noreferrer" class="drawer__link">
                        {{ Icon::svg($icons[$library['collectionType'] ?? ''] ?? 'folder-open') }}
                        <span class="drawer__text">{{ $library['name'] }}</span>
                        {{ Icon::svg('external-link', 'icon--xs drawer__ext') }}
                    </a>
                @else
                    <a href="{{ route('libraries.show', $library['id']) }}" class="drawer__link">
                        {{ Icon::svg($icons[$library['collectionType'] ?? ''] ?? 'folder-open') }}
                        <span class="drawer__text">{{ $library['name'] }}</span>
                    </a>
                @endif
            @endforeach
        </nav>
    </div>

    <main class="main {{ $overlay ? '' : 'main--padded' }}">
        @yield('content')
    </main>

    <footer class="footer">
        @if ($external !== [])
            <div class="footer__row">
                <span class="footer__label">Во встроенном клиенте:</span>
                @foreach ($external as $library)
                    <a href="{{ $library['externalUrl'] }}" target="_blank" rel="noreferrer" class="footer__link">{{ $library['name'] }} {{ Icon::svg('external-link', 'icon--xs') }}</a>
                @endforeach
            </div>
        @endif
        <div class="footer__row footer__row--muted">
            Облегчённая версия для старых устройств ·
            <a href="{{ route('lite', 'off') }}" class="footer__link">Полная версия</a>
        </div>
    </footer>
@endsection
