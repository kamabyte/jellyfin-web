@props(['title', 'href' => null])
{{-- Полка: заголовок и горизонтальная лента карточек (листается пальцем). --}}
<section class="shelf">
    <h2 class="shelf__title section-title">
        @if ($href)
            <a href="{{ $href }}" class="shelf__link">{{ $title }} {{ App\Lite\Icon::svg('chevron-right', 'shelf__chevron') }}</a>
        @else
            {{ $title }}
        @endif
    </h2>
    <div class="shelf__track">
        {{ $slot }}
    </div>
</section>
