{{-- Строка «★ 7.8 · 2019 · 16+ · 2 ч 15 мин · драма, триллер». --}}
@php
    $parts = App\Lite\Format::metaParts($item);
    $rating = $item['rating'];
@endphp
<div class="meta {{ $class ?? '' }}">
    @if ($rating !== null)
        <span class="meta__rating">{{ App\Lite\Icon::svg('star', 'icon--xs meta__star', fill: true) }} {{ number_format($rating, 1, '.', '') }}</span>
    @endif
    @foreach ($parts as $index => $part)
        @if ($index > 0 || $rating !== null)
            <span class="meta__sep" aria-hidden="true">·</span>
        @endif
        <span>{{ $part }}</span>
    @endforeach
</div>
