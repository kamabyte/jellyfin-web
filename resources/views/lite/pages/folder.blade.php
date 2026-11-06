@php
    use App\Lite\Format;
    use App\Lite\Icon;
@endphp
@extends('lite.layouts.app')

@section('title', $folder['name'])

@section('content')
    <div class="px">
        <div class="page-head">
            <div class="page-head__main">
                <h1 class="page-title">{{ Icon::svg('folder-open', 'icon--lg page-title__icon') }} <span class="truncate">{{ $folder['name'] }}</span></h1>
                @if ($folder['overview'])
                    <p class="page-lead">{{ $folder['overview'] }}</p>
                @endif
            </div>
            @include('lite.partials.filters', ['filters' => ['sort' => $sort], 'sorts' => $sorts])
        </div>
        @if ($items['data'] === [])
            <x-lite.empty title="Папка пуста" />
        @else
            @include('lite.partials.scroll-grid', ['items' => $items, 'landscape' => Format::prefersLandscape($items['data'])])
        @endif
    </div>
@endsection
