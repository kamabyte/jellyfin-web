@php
    use App\Lite\Format;
    $toast = $page['flash']['toast'] ?? null;
@endphp
<!DOCTYPE html>
<html lang="ru">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        {{-- С экрана «Домой» — как приложение, без панелей Safari. --}}
        <meta name="apple-mobile-web-app-capable" content="yes">
        <meta name="apple-mobile-web-app-status-bar-style" content="black">
        <meta name="apple-mobile-web-app-title" content="{{ config('app.name') }}">
        <meta name="format-detection" content="telephone=no">
        <meta name="theme-color" content="#070709">
        <link rel="icon" href="/favicon.svg" type="image/svg+xml">
        {{-- Значок на экране «Домой» в iOS: без него — снимок страницы. --}}
        <link rel="apple-touch-icon" href="/apple-touch-icon.png">
        <title>@hasSection('title')@yield('title') · @endif{{ config('app.name') }}</title>
        <link rel="stylesheet" href="{{ Format::asset('lite.css') }}">
    </head>
    <body class="@yield('body-class')">
        @yield('body')

        <div class="toasts" data-toasts>
            @if ($toast)
                <div class="toast {{ ($toast['type'] ?? '') === 'error' ? 'toast--error' : '' }}" data-toast>
                    <div class="toast__title">{{ $toast['message'] }}</div>
                    @if (! empty($toast['description']))
                        <div class="toast__text">{{ $toast['description'] }}</div>
                    @endif
                </div>
            @endif
        </div>

        <script src="{{ Format::asset('lite.js') }}"></script>
        @stack('scripts')
    </body>
</html>
