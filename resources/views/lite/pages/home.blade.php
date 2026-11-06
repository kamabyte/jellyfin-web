@php
    use App\Lite\Format;
    use App\Lite\Icon;
    $shelves = $shelves ?? [];
@endphp
@extends('lite.layouts.app', ['overlay' => true])

@section('title', 'Главная')

@section('content')
    @if ($hero !== [])
        {{-- Витрина: свежие фильмы и сериалы, листается свайпом и стрелками. --}}
        <section class="hero" data-hero aria-label="Новинки">
            @foreach ($hero as $index => $slide)
                <div class="hero__slide {{ $index === 0 ? 'hero__slide--active' : '' }}" data-hero-slide>
                    @if ($slide['backdrop'])
                        <img class="hero__backdrop" @if ($index === 0) src="{{ $slide['backdrop'] }}" @else data-hero-src="{{ $slide['backdrop'] }}" @endif alt="">
                    @endif
                    <div class="hero__shade hero__shade--bottom"></div>
                    <div class="hero__shade hero__shade--left"></div>
                    <div class="hero__content">
                        @if ($slide['logo'])
                            <img class="hero__logo" src="{{ $slide['logo'] }}" alt="{{ $slide['name'] }}">
                        @else
                            <h1 class="hero__title">{{ $slide['name'] }}</h1>
                        @endif
                        @include('lite.partials.meta', ['item' => $slide, 'class' => 'hero__meta'])
                        @if ($slide['overview'])
                            <p class="hero__overview">{{ $slide['overview'] }}</p>
                        @endif
                        <div class="actions">
                            <a href="{{ route('watch', $slide['id']) }}" class="btn btn--primary btn--lg">{{ Icon::svg('play', '', fill: true) }} {{ $slide['resumeAt'] ? 'Продолжить' : 'Смотреть' }}</a>
                            <a href="{{ route('items.show', $slide['id']) }}" class="btn btn--glass btn--lg">{{ Icon::svg('info') }} Подробнее</a>
                        </div>
                    </div>
                </div>
            @endforeach
            @if (count($hero) > 1)
                <div class="hero__controls">
                    <button type="button" class="hero__arrow" data-hero-prev aria-label="Предыдущий">{{ Icon::svg('chevron-left', 'icon--lg') }}</button>
                    <button type="button" class="hero__arrow" data-hero-next aria-label="Следующий">{{ Icon::svg('chevron-right', 'icon--lg') }}</button>
                    <span class="hero__counter"><span data-hero-index>01</span><span class="hero__total"> / {{ sprintf('%02d', count($hero)) }}</span></span>
                    <div class="hero__dots">
                        @foreach ($hero as $index => $slide)
                            <button type="button" class="hero__dot {{ $index === 0 ? 'hero__dot--active' : '' }}" data-hero-dot="{{ $index }}" aria-label="Слайд {{ $index + 1 }}: {{ $slide['name'] }}"><span class="hero__dot-fill"></span></button>
                        @endforeach
                    </div>
                </div>
            @endif
        </section>
    @else
        <div class="hero-spacer"></div>
    @endif

    <div class="stack {{ $hero !== [] ? 'stack--under-hero' : '' }}">
        @if ($resume !== [])
            <x-lite.shelf title="Продолжить просмотр">
                @foreach ($resume as $item)
                    @include('lite.partials.landscape-card', ['item' => $item, 'play' => true, 'menu' => 'resume', 'class' => 'shelf__landscape'])
                @endforeach
            </x-lite.shelf>
        @endif

        @if ($nextUp !== [])
            <x-lite.shelf title="Следующие серии">
                @foreach ($nextUp as $item)
                    @include('lite.partials.landscape-card', ['item' => $item, 'play' => true, 'menu' => 'next', 'class' => 'shelf__landscape'])
                @endforeach
            </x-lite.shelf>
        @endif

        @foreach ($shelves as $shelf)
            @php($landscape = Format::prefersLandscape($shelf['items']))
            <x-lite.shelf :title="'Новое: '.$shelf['library']['name']" :href="route('libraries.show', $shelf['library']['id'])">
                @foreach ($shelf['items'] as $item)
                    @if ($landscape)
                        @include('lite.partials.landscape-card', ['item' => $item, 'class' => 'shelf__landscape'])
                    @else
                        @include('lite.partials.poster-card', ['item' => $item, 'class' => 'shelf__poster'])
                    @endif
                @endforeach
            </x-lite.shelf>
        @endforeach
    </div>
@endsection
