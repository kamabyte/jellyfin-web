<!DOCTYPE html>
<html lang="ru" class="dark">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
        <meta name="color-scheme" content="dark">
        <meta name="theme-color" content="#0b0a10">

        <style>
            html { background-color: #0b0a10; }
        </style>

        <link rel="icon" href="/favicon.svg" type="image/svg+xml">
        {{-- Значок на экране «Домой» в iOS: без него — снимок страницы. --}}
        <link rel="apple-touch-icon" href="/apple-touch-icon.png">

        {{-- Старый браузер (iPad на iOS 10 и т. п.) этот клиент не запустит:
             сборке и Tailwind v4 нужен Safari 16.4+. Ему — облегчённая
             версия (App\Lite\Lite): кука и перезагрузка. --}}
        <script>
            (function () {
                var css = window.CSS;
                if (css && css.supports && css.supports('color', 'color-mix(in srgb, red, red)')) return;
                document.cookie = 'lite=1; path=/; max-age=157680000';
                if (/(^|; )lite=1/.test(document.cookie)) location.reload();
            })();
        </script>

        @viteReactRefresh
        @vite(['resources/css/app.css', 'resources/js/app.tsx', "resources/js/pages/{$page['component']}.tsx"])
        <x-inertia::head>
            <title>{{ config('app.name') }}</title>
        </x-inertia::head>
    </head>
    <body class="font-sans antialiased">
        <x-inertia::app />
    </body>
</html>
