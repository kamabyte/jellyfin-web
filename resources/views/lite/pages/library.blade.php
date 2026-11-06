@php
    use App\Lite\Format;
    use App\Lite\Icon;
    $icons = ['movies' => 'film', 'tvshows' => 'tv', 'boxsets' => 'library'];
    $filtered = $filters['unwatched'] || $filters['genre'];
@endphp
@extends('lite.layouts.app')

@section('title', $library['name'])

@section('content')
    <div class="px">
        <div class="page-head">
            <h1 class="page-title">{{ Icon::svg($icons[$library['collectionType'] ?? ''] ?? 'folder-open', 'icon--lg page-title__icon') }} {{ $library['name'] }}</h1>
            @include('lite.partials.filters', [
                'filters' => $filters,
                'sorts' => $sorts,
                'genres' => $genres,
                'withUnwatched' => $library['kind'] !== 'folders',
            ])
        </div>
        @if ($items['data'] === [])
            <x-lite.empty
                :title="$filtered ? 'Ничего не нашлось' : 'Здесь пока пусто'"
                :description="$filtered ? 'Попробуйте снять фильтры.' : 'Когда в медиатеку добавят файлы, они появятся здесь.'" />
        @else
            @include('lite.partials.scroll-grid', [
                'items' => $items,
                'landscape' => $library['kind'] === 'folders' && Format::prefersLandscape($items['data']),
            ])
        @endif
    </div>
@endsection
