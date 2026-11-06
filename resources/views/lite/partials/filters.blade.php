{{--
    Сортировка и фильтры: обычная GET-форма, выбор в списке сразу её
    отправляет (lite.js). Адрес можно отправить ссылкой, сетка — с начала.
--}}
@php
    use App\Lite\Icon;
    $genres = $genres ?? [];
    $withUnwatched = $withUnwatched ?? false;
@endphp
<form method="get" action="{{ request()->url() }}" class="filters" data-autosubmit>
    <label class="select">
        <select name="sort" aria-label="Сортировка">
            @foreach ($sorts as $option)
                <option value="{{ $option['value'] }}" @selected($option['value'] === $filters['sort'])>{{ $option['label'] }}</option>
            @endforeach
        </select>
    </label>
    @if ($genres !== [])
        <label class="select">
            <select name="genre" aria-label="Жанр">
                <option value="">Все жанры</option>
                @foreach ($genres as $genre)
                    <option value="{{ $genre }}" @selected($genre === ($filters['genre'] ?? null))>{{ $genre }}</option>
                @endforeach
            </select>
        </label>
    @endif
    @if ($withUnwatched)
        @if ($filters['unwatched'])
            <input type="hidden" name="unwatched" value="1">
        @endif
        <button type="submit" class="chip {{ $filters['unwatched'] ? 'chip--active' : '' }}"
                name="unwatched" value="{{ $filters['unwatched'] ? '' : '1' }}" aria-pressed="{{ $filters['unwatched'] ? 'true' : 'false' }}">
            {{ Icon::svg($filters['unwatched'] ? 'eye-off' : 'eye', 'icon--sm') }} Непросмотренные
        </button>
    @endif
    <noscript><button type="submit" class="chip">Применить</button></noscript>
</form>
