{{--
    Кнопки под заголовком: смотреть (или продолжить), с начала, отметки
    «просмотрено» и «избранное», трейлер и ссылки, встроенный клиент.
--}}
@php
    use App\Lite\Format;
    use App\Lite\Icon;
    $resumed = $playId === $item['id'] && $item['resumeAt'];
    $label = $playLabel ?? ($resumed ? 'Продолжить с '.Format::duration($item['resumeAt']) : 'Смотреть');
@endphp
<div class="actions">
    <a href="{{ route('watch', $playId) }}" class="btn btn--primary btn--lg">{{ Icon::svg('play', '', fill: true) }} {{ $label }}</a>
    @if ($resumed)
        <a href="{{ route('watch', ['item' => $item['id'], 't' => 0]) }}" class="round-btn" aria-label="С начала" title="С начала">{{ Icon::svg('rotate-ccw') }}</a>
    @endif
    <form method="post" action="{{ route($item['played'] ? 'items.played.destroy' : 'items.played.store', $item['id']) }}">
        @csrf
        @if ($item['played'])
            @method('DELETE')
        @endif
        @php($playedLabel = $item['played'] ? 'Отметить непросмотренным' : 'Отметить просмотренным')
        <button type="submit" class="round-btn {{ $item['played'] ? 'round-btn--active' : '' }}" aria-label="{{ $playedLabel }}" title="{{ $playedLabel }}">{{ Icon::svg('check', $item['played'] ? 'icon--bold' : '') }}</button>
    </form>
    <form method="post" action="{{ route($item['favorite'] ? 'items.favorite.destroy' : 'items.favorite.store', $item['id']) }}">
        @csrf
        @if ($item['favorite'])
            @method('DELETE')
        @endif
        @php($favoriteLabel = $item['favorite'] ? 'Убрать из избранного' : 'В избранное')
        <button type="submit" class="round-btn {{ $item['favorite'] ? 'round-btn--active' : '' }}" aria-label="{{ $favoriteLabel }}" title="{{ $favoriteLabel }}">{{ Icon::svg('heart', '', fill: $item['favorite']) }}</button>
    </form>
    <div class="dropdown" data-dropdown>
        <button type="button" class="round-btn" data-dropdown-toggle aria-label="Ещё">{{ Icon::svg('ellipsis') }}</button>
        <div class="dropdown__menu dropdown__menu--up">
            @if ($item['trailer'])
                <a class="dropdown__item" href="{{ $item['trailer'] }}" target="_blank" rel="noreferrer">{{ Icon::svg('monitor-play', 'icon--sm') }} Трейлер</a>
            @endif
            @foreach ($item['links'] as $link)
                <a class="dropdown__item" href="{{ $link['url'] }}" target="_blank" rel="noreferrer">{{ Icon::svg('external-link', 'icon--sm') }} {{ $link['label'] }}</a>
            @endforeach
            <a class="dropdown__item" href="{{ $item['builtInUrl'] }}" target="_blank" rel="noreferrer">{{ Icon::svg('external-link', 'icon--sm') }} Открыть в стандартном клиенте</a>
        </div>
    </div>
</div>
