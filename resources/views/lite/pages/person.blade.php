@php
    use App\Lite\Format;
@endphp
@extends('lite.layouts.app')

@section('title', $person['name'])

@section('content')
    <div class="px">
        <div class="person-head">
            @include('lite.partials.art', ['src' => $person['poster'], 'item' => $person, 'ratio' => 'poster', 'class' => 'person-head__photo'])
            <div class="person-head__info">
                <h1 class="page-title page-title--xl">{{ $person['name'] }}</h1>
                @if ($person['premiereDate'])
                    <p class="page-lead">Родился(-ась) {{ Format::date($person['premiereDate']) }}</p>
                @endif
                @if ($person['overview'])
                    <button type="button" class="person-head__bio clamp-4" data-expand>{{ $person['overview'] }}</button>
                @endif
            </div>
        </div>
        <h2 class="section-title">Фильмы и сериалы</h2>
        @if ($items === [])
            <x-lite.empty title="В медиатеке ничего нет" />
        @else
            @include('lite.partials.grid', ['items' => $items, 'landscape' => false])
        @endif
    </div>
@endsection
