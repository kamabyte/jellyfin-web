{{--
    Шапка страницы фильма, сериала или серии: фон во всю ширину, постер
    слева, название (логотипом, если есть), сведения и кнопки ($actions).
--}}
@php
    $poster = $poster ?? true;
@endphp
<section class="detail">
    <div class="detail__backdrop">
        @if ($item['backdrop'])
            <img class="detail__backdrop-img" src="{{ $item['backdrop'] }}" alt="">
        @endif
        <div class="detail__shade detail__shade--bottom"></div>
        <div class="detail__shade detail__shade--left"></div>
    </div>
    <div class="detail__body">
        @if ($poster)
            @include('lite.partials.art', ['src' => $item['poster'], 'item' => $item, 'ratio' => 'poster', 'class' => 'detail__poster'])
        @endif
        <div class="detail__info">
            @if (! empty($eyebrow))
                <div class="detail__eyebrow">{!! $eyebrow !!}</div>
            @endif
            @if ($item['logo'] && $item['type'] !== 'Episode')
                <img class="detail__logo" src="{{ $item['logo'] }}" alt="{{ $item['name'] }}">
            @else
                <h1 class="detail__title">{{ $item['name'] }}</h1>
            @endif
            @if ($item['tagline'])
                <p class="detail__tagline">{{ $item['tagline'] }}</p>
            @endif
            <div class="detail__meta">
                @include('lite.partials.meta', ['item' => $item])
                @include('lite.partials.media-badges', ['media' => $item['media']])
            </div>
            @if ($item['overview'])
                <p class="detail__overview">{{ $item['overview'] }}</p>
            @endif
            @include('lite.partials.item-actions', ['item' => $item, 'playId' => $playId ?? $item['id'], 'playLabel' => $playLabel ?? null])
        </div>
    </div>
</section>
