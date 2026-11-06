{{-- Постер 2:3 — фильмы, сериалы, люди, коллекции. Только 4K — блёкло. --}}
<a href="{{ App\Lite\Format::href($item) }}" class="card {{ App\Lite\Lite::tooLarge($item) ? 'card--too-large' : '' }} {{ $class ?? '' }}">
    <div class="card__frame">
        @include('lite.partials.art', ['src' => $item['poster'], 'item' => $item, 'ratio' => $item['type'] === 'Person' ? 'square' : 'poster'])
        @include('lite.partials.card-badges', ['item' => $item])
    </div>
    <div class="card__text">
        <div class="card__title">{{ $item['name'] }}</div>
        <div class="card__caption">{{ App\Lite\Format::cardSubtitle($item) ?: ' ' }}</div>
    </div>
</a>
