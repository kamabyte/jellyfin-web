{{-- «Подробности» внизу страницы: жанры, студии, что за файл. --}}
@php
    use App\Lite\Format;
    $media = $item['media'];
    $rows = array_filter([
        'Жанры' => implode(', ', $item['genres']),
        'Студии' => implode(', ', $item['studios']),
        'Видео' => $media ? implode(' · ', array_filter([$media['resolution'], $media['videoCodec'], $media['hdr']])) : null,
        'Звук' => $media && $media['audio']
            ? ($media['audioTracks'] > 1 ? $media['audio'].' и ещё '.($media['audioTracks'] - 1) : $media['audio'])
            : null,
        'Субтитры' => $media && $media['subtitles'] > 0 ? (string) $media['subtitles'] : null,
        'Файл' => $media ? implode(' · ', array_filter([$media['container'] ? mb_strtoupper($media['container']) : null, Format::bytes($media['size'])])) : null,
    ]);
@endphp
@if ($rows !== [])
    <section class="px">
        <h2 class="section-title">Подробности</h2>
        <dl class="details">
            @foreach ($rows as $label => $value)
                <div class="details__row">
                    <dt class="details__label">{{ $label }}</dt>
                    <dd class="details__value">{{ $value }}</dd>
                </div>
            @endforeach
        </dl>
    </section>
@endif
