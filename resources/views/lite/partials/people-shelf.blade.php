@if ($people !== [])
    <x-lite.shelf title="В ролях и съёмочная группа">
        @foreach ($people as $person)
            <a href="{{ route('items.show', $person['id']) }}" class="person">
                <div class="person__photo">
                    <span class="person__initials">{{ App\Lite\Format::initials($person['name']) }}</span>
                    @if ($person['image'])
                        <img class="person__img" data-src="{{ $person['image'] }}" alt="">
                    @endif
                </div>
                <div class="person__name">{{ $person['name'] }}</div>
                @if ($person['role'])
                    <div class="person__role">{{ $person['role'] }}</div>
                @endif
            </a>
        @endforeach
    </x-lite.shelf>
@endif
