@props(['title', 'description' => null, 'icon' => 'popcorn'])
<div {{ $attributes->merge(['class' => 'empty']) }}>
    <div class="empty__icon">{{ App\Lite\Icon::svg($icon, 'icon--lg') }}</div>
    <h2 class="empty__title">{{ $title }}</h2>
    @if ($description)
        <p class="empty__text">{{ $description }}</p>
    @endif
    {{ $slot }}
</div>
