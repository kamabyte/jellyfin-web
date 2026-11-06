{{-- Серии сезона строками: кадр, номер и название, описание, прогресс. --}}
@php
    use App\Lite\Format;
    use App\Lite\Icon;
@endphp
<ol class="episodes">
    @foreach ($episodes as $episode)
        <li>
            <a href="{{ route('watch', $episode['id']) }}" class="episode {{ $episode['id'] === ($currentId ?? null) ? 'episode--current' : '' }}">
                <div class="episode__thumb">
                    @include('lite.partials.art', ['src' => $episode['landscape'] ?? $episode['poster'], 'item' => $episode, 'ratio' => 'video'])
                    <span class="episode__play">{{ Icon::svg('play', 'icon--lg', fill: true) }}</span>
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
