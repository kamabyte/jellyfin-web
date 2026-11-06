{{--
    Сетка медиатеки или папки (Inertia::scroll): следующая страница
    подгружается при прокрутке (lite.js), без скрипта — по ссылке.
--}}
@php
    $scroll = $page['scrollProps']['items'] ?? [];
    $next = $scroll['nextPage'] ?? null;
    $nextUrl = $next ? request()->fullUrlWithQuery([$scroll['pageName'] ?? 'page' => $next]) : null;
@endphp
@include('lite.partials.grid', ['items' => $items['data'], 'landscape' => $landscape, 'scroll' => true])
@if ($nextUrl)
    <div class="more" data-scroll-more>
        <a href="{{ $nextUrl }}" class="btn btn--secondary" data-scroll-next>Показать ещё</a>
    </div>
@endif
