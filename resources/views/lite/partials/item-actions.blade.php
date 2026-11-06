{{--
    Кнопки под заголовком: смотреть (или продолжить), с начала, отметки
    «просмотрено» и «избранное», трейлер и ссылки, встроенный клиент.
    Версии в 4K здесь не проиграть: если есть поменьше — плеер возьмёт её
    (и об этом строка под кнопками), если нет — кнопка неактивна.
--}}
@php
    use App\Lite\Format;
    use App\Lite\Icon;
    use App\Lite\Lite;
    $own = $playId === $item['id'];
    $version = $own ? Lite::version($item) : null;
    $playable = ! $own || $version !== null;
    $resumed = $own && $playable && $item['resumeAt'];
    $label = $playLabel ?? ($resumed ? 'Продолжить с '.Format::duration($item['resumeAt']) : 'Смотреть');
    $smaller = $version !== null && $item['sources'] !== [] && $version['id'] !== $item['sources'][0]['id'];
@endphp
<div class="actions">
    @if ($playable)
        <a href="{{ route('watch', $playId) }}" class="btn btn--primary btn--lg">{{ Icon::svg('play', '', fill: true) }} {{ $label }}</a>
    @else
        <span class="btn btn--primary btn--lg btn--disabled" aria-disabled="true">{{ Icon::svg('play', '', fill: true) }} Только в 4K</span>
    @endif
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
@if (! $playable)
    <p class="detail__note">Есть только в 4K — на этом устройстве не показать: сервер не успевает уменьшать 4K.</p>
@elseif ($smaller)
    <p class="detail__note">На этом устройстве — версия {{ App\Http\Resources\ItemDetail::resolution($version['width']) ?? $version['name'] }}: 4K ему не по силам.</p>
@endif
