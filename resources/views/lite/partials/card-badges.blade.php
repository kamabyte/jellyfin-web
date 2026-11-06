@if ($item['played'])
    <span class="card__badge" aria-label="Просмотрено">{{ App\Lite\Icon::svg('check', 'icon--xs icon--bold') }}</span>
@elseif ($item['unplayed'])
    <span class="card__badge card__badge--count">{{ $item['unplayed'] }}</span>
@endif
@if ($item['progress'] !== null)
    <div class="card__progress"><div class="card__progress-bar" style="width: {{ max($item['progress'], 3) }}%"></div></div>
@endif
