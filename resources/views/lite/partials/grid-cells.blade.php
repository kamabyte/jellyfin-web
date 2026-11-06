@foreach ($items as $item)
    <div class="grid__cell">
        @if ($landscape)
            @include('lite.partials.landscape-card', ['item' => $item, 'play' => ! $item['isFolder']])
        @else
            @include('lite.partials.poster-card', ['item' => $item])
        @endif
    </div>
@endforeach
