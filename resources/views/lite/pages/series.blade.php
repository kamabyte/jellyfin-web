@php
    use App\Lite\Format;
    $playId = $nextUp['id'] ?? $episodes[0]['id'] ?? $series['id'];
    $playLabel = $nextUp
        ? ($nextUp['progress'] ? 'Продолжить' : 'Смотреть').' '.Format::episodeLabel($nextUp)
        : 'Смотреть';
    $eyebrow = $series['childCount'] ? e(Format::plural($series['childCount'], ['сезон', 'сезона', 'сезонов'])) : null;
@endphp
@extends('lite.layouts.app', ['overlay' => true])

@section('title', $series['name'])

@section('content')
    @include('lite.partials.detail-hero', ['item' => $series, 'eyebrow' => $eyebrow, 'playId' => $playId, 'playLabel' => $playLabel])

    <div class="stack">
        <section class="px" id="episodes">
            @if (count($seasons) > 1)
                <div class="tabs" role="tablist" aria-label="Сезоны">
                    @foreach ($seasons as $season)
                        <a href="{{ route('items.show', ['item' => $series['id'], 'season' => $season['id']]) }}#episodes"
                           role="tab" aria-selected="{{ $season['id'] === $seasonId ? 'true' : 'false' }}"
                           class="tab {{ $season['id'] === $seasonId ? 'tab--active' : '' }}" data-replace>
                            {{ $season['name'] }}@if ($season['played']) <span aria-label="просмотрен">✓</span>@endif
                        </a>
                    @endforeach
                </div>
            @elseif (count($seasons) === 1)
                <h2 class="section-title">{{ $seasons[0]['name'] }}</h2>
            @endif
            <div class="narrow">
                @include('lite.partials.episode-list', ['episodes' => $episodes, 'currentId' => $nextUp['id'] ?? null])
            </div>
        </section>

        @include('lite.partials.people-shelf', ['people' => $series['people']])

        @if ($similar !== [])
            <x-lite.shelf title="Похожие сериалы">
                @foreach ($similar as $entry)
                    @include('lite.partials.poster-card', ['item' => $entry, 'class' => 'shelf__poster'])
                @endforeach
            </x-lite.shelf>
        @endif

        @include('lite.partials.media-details', ['item' => $series])
    </div>
@endsection
