<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;

/**
 * Серия в списке сезона: карточка плюс описание и дата выхода.
 *
 * @property array<string, mixed> $resource
 */
class EpisodeCard extends ItemCard
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            ...parent::toArray($request),
            'overview' => $this->resource['Overview'] ?? null,
            'premiereDate' => $this->resource['PremiereDate'] ?? null,
        ];
    }
}
