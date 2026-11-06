{{--
    Горизонтальная карточка 16:9: «Продолжить просмотр», серии, видео из
    папок. play — сразу в плеер; menu — «⋮» с действиями: 'resume' (можно
    убрать из «Продолжить просмотр») или 'next' (только отметить).
--}}
@php
    use App\Lite\Format;
    use App\Lite\Icon;
    $play = $play ?? false;
    $menu = $menu ?? null;
    $isEpisode = $item['type'] === 'Episode';
    $title = $isEpisode && $item['seriesName'] ? $item['seriesName'] : $item['name'];
    $caption = $isEpisode
        ? implode(' · ', array_filter([Format::episodeLabel($item), $item['name']]))
        : (Format::remaining($item) ?: Format::yearRange($item));
@endphp
<div class="card card--landscape {{ $menu ? 'card--menu' : '' }} {{ $class ?? '' }}">
    <a href="{{ Format::href($item, $play) }}" class="card__link">
        <div class="card__frame">
            @include('lite.partials.art', ['src' => $item['landscape'] ?? $item['poster'], 'item' => $item, 'ratio' => 'video'])
            @if ($play)
                <span class="card__play">{{ Icon::svg('play', 'icon--sm', fill: true) }}</span>
            @endif
            @include('lite.partials.card-badges', ['item' => $item])
        </div>
        <div class="card__text">
            <div class="card__title">{{ $title }}</div>
            <div class="card__caption">{{ $caption ?: ' ' }}</div>
        </div>
    </a>
    @if ($menu)
        <div class="dropdown card__menu" data-dropdown>
            <button type="button" class="icon-btn icon-btn--sm" data-dropdown-toggle aria-label="Действия">{{ Icon::svg('ellipsis-vertical', 'icon--sm') }}</button>
            <div class="dropdown__menu dropdown__menu--right dropdown__menu--up">
                @unless ($item['played'])
                    <form method="post" action="{{ route('items.played.store', $item['id']) }}">
                        @csrf
                        <button type="submit" class="dropdown__item">{{ Icon::svg('check', 'icon--sm') }} Отметить просмотренным</button>
                    </form>
                @endunless
                @if ($menu === 'resume')
                    <form method="post" action="{{ route('items.resume.destroy', $item['id']) }}">
                        @csrf
                        @method('DELETE')
                        <button type="submit" class="dropdown__item">{{ Icon::svg('x', 'icon--sm') }} Убрать из «Продолжить просмотр»</button>
                    </form>
                @endif
                <div class="dropdown__sep"></div>
                @if ($isEpisode && $item['seriesId'])
                    <a class="dropdown__item" href="{{ route('items.show', $item['seriesId']) }}">{{ Icon::svg('tv', 'icon--sm') }} Страница сериала</a>
                @else
                    <a class="dropdown__item" href="{{ route('items.show', $item['id']) }}">{{ Icon::svg('info', 'icon--sm') }} Подробнее</a>
                @endif
            </div>
        </div>
    @endif
</div>
