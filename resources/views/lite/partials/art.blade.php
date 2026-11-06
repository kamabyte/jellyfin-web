{{-- Картинка с заглушкой: название и значок, пока грузится и если её нет. --}}
@php
    $icon = $item['type'] === 'Person' ? 'user' : ($item['isFolder'] ? 'folder' : 'film');
@endphp
<div class="art art--{{ $ratio }} {{ $class ?? '' }}">
    <div class="art__fallback">
        {{ App\Lite\Icon::svg($icon, 'icon--xl') }}
        <span class="art__name">{{ $item['name'] }}</span>
    </div>
    @if ($src)
        <img class="art__img" data-src="{{ $src }}" alt="">
    @endif
</div>
