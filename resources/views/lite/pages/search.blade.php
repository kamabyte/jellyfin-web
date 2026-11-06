@php
    use App\Lite\Icon;
    $empty = count($titles) + count($videos) + count($people) === 0;
    $groups = [
        ['title' => 'Фильмы и сериалы', 'items' => $titles, 'landscape' => false],
        ['title' => 'Серии и видео', 'items' => $videos, 'landscape' => true],
        ['title' => 'Люди', 'items' => $people, 'landscape' => false],
    ];
@endphp
@extends('lite.layouts.app')

@section('title', $query !== '' ? '«'.$query.'»' : 'Поиск')

@section('content')
    <div class="px">
        {{-- Ищет по мере набора (lite.js), без скрипта — по «Найти». --}}
        <form method="get" action="{{ route('search') }}" role="search" class="search" data-live-search>
            {{ Icon::svg('search', 'icon--sm search__icon') }}
            <input type="search" name="q" value="{{ $query }}" class="search__input" placeholder="Фильмы, сериалы, актёры"
                   aria-label="Поиск" autocomplete="off" autocorrect="off" @if ($query === '') autofocus @endif>
        </form>
        <div data-search-results>
            @if ($query === '')
                <x-lite.empty icon="search" title="Что будем смотреть?" description="Ищите фильмы, сериалы, серии и актёров." />
            @elseif ($empty)
                <x-lite.empty icon="search" title="Ничего не нашлось" :description="'По запросу «'.$query.'» в медиатеке ничего нет.'" />
            @else
                <div class="stack stack--flat">
                    @foreach ($groups as $group)
                        @if ($group['items'] !== [])
                            <section>
                                <h2 class="section-title">{{ $group['title'] }}</h2>
                                @include('lite.partials.grid', ['items' => $group['items'], 'landscape' => $group['landscape']])
                            </section>
                        @endif
                    @endforeach
                </div>
            @endif
        </div>
    </div>
@endsection
