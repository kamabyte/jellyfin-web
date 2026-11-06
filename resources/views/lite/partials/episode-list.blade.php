{{--
    Серии сезона строками: кадр, номер и название, описание, прогресс. Серия
    только в 4K — блёклая и ведёт на свою страницу, а не в плеер.
--}}
@php
    use App\Lite\Format;
    use App\Lite\Icon;
    use App\Lite\Lite;
@endphp
<ol class="episodes">
    @foreach ($episodes as $episode)
        @php($tooLarge = Lite::tooLarge($episode))
        <li>
            <a href="{{ $tooLarge ? route('items.show', $episode['id']) : route('watch', $episode['id']) }}" class="episode {{ $episode['id'] === ($currentId ?? null) ? 'episode--current' : '' }} {{ $tooLarge ? 'episode--too-large' : '' }}">
                <div class="episode__thumb">
                    @include('lite.partials.art', ['src' => $episode['landscape'] ?? $episode['poster'], 'item' => $episode, 'ratio' => 'video'])
                    @if ($tooLarge)
                        <span class="card__flag">4K</span>
                    @else
                        <span class="episode__play">{{ Icon::svg('play', 'icon--lg', fill: true) }}</span>
                    @endif
                    @if ($episode['progress'] !== null)
                        <div class="episode__progress"><div class="card__progress-bar" style="width: {{ $episode['progress'] }}%"></div></div>
                    @endif
                </div>
                <div class="episode__body">
                    <div class="episode__head">
                        <h3 class="episode__title">
                            @if ($episode['episode'] !== null)
                                <span class="episode__num">{{ $episode['episode'] }}.</span>
                            @endif
                            {{ $episode['name'] }}
                        </h3>
                        @if ($episode['played'])
                            <span class="episode__check" aria-label="Просмотрено">{{ Icon::svg('check', 'icon--sm icon--bold') }}</span>
                        @endif
                    </div>
                    <div class="episode__info">{{ implode(' · ', array_filter([Format::runtime($episode['runtime']), Format::date($episode['premiereDate'])])) }}</div>
                    @if ($episode['overview'])
                        <p class="episode__overview">{{ $episode['overview'] }}</p>
                    @endif
                </div>
            </a>
        </li>
    @endforeach
</ol>
