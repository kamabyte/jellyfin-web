{{-- Фильм, серия или просто видео. --}}
@php
    $isEpisode = $item['type'] === 'Episode';
    $eyebrow = null;
    if ($isEpisode && $item['seriesId']) {
        $eyebrow = '<a href="'.e(route('items.show', $item['seriesId'])).'" class="detail__series">'.e($item['seriesName']).'</a>';
        if ($item['season'] !== null) {
            $eyebrow .= ' <span>Сезон '.e($item['season']).($item['episode'] !== null ? ', серия '.e($item['episode']) : '').'</span>';
        }
    }
@endphp
@extends('lite.layouts.app', ['overlay' => true])

@section('title', $isEpisode && $item['seriesName'] ? $item['name'].' — '.$item['seriesName'] : $item['name'])

@section('content')
    @include('lite.partials.detail-hero', ['item' => $item, 'poster' => ! $isEpisode, 'eyebrow' => $eyebrow])

    <div class="stack">
        @if ($episodes !== [])
            <section class="px">
                <h2 class="section-title">{{ $item['season'] !== null ? 'Сезон '.$item['season'] : 'Серии' }}</h2>
                <div class="narrow">
                    @include('lite.partials.episode-list', ['episodes' => $episodes, 'currentId' => $item['id']])
                </div>
            </section>
        @endif

        @include('lite.partials.people-shelf', ['people' => $item['people']])

        @if ($similar !== [])
            <x-lite.shelf title="Похожее">
                @foreach ($similar as $entry)
                    @include('lite.partials.poster-card', ['item' => $entry, 'class' => 'shelf__poster'])
                @endforeach
            </x-lite.shelf>
        @endif

        @include('lite.partials.media-details', ['item' => $item])
    </div>
@endsection
