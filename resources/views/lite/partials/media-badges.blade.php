@php
    $badges = $media ? array_filter([$media['resolution'], $media['hdr'], $media['videoCodec']]) : [];
@endphp
@if ($badges !== [])
    <div class="badges">
        @foreach ($badges as $badge)
            <span class="badge">{{ $badge }}</span>
        @endforeach
    </div>
@endif
