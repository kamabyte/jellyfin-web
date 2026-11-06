{{-- Сетка карточек; ячейки — отдельно, их же догружает прокрутка. --}}
<div class="grid {{ $landscape ? 'grid--landscape' : 'grid--poster' }}" @isset($scroll) data-scroll-grid @endisset>
    @include('lite.partials.grid-cells', ['items' => $items, 'landscape' => $landscape])
</div>
