<?php

namespace App\Http\Resources;

use App\Jellyfin\Image;
use App\Jellyfin\Ticks;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Карточка в сетке и на полках: постер, горизонтальная картинка для
 * «Продолжить просмотр», прогресс и отметки пользователя.
 *
 * @property array<string, mixed> $resource
 */
class ItemCard extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $item = $this->resource;
        $type = (string) $item['Type'];

        return [
            'id' => (string) $item['Id'],
            'type' => $type,
            'name' => (string) $item['Name'],
            'year' => $item['ProductionYear'] ?? null,
            'endYear' => isset($item['EndDate']) ? (int) substr((string) $item['EndDate'], 0, 4) : null,
            'seriesName' => $item['SeriesName'] ?? null,
            'season' => $item['ParentIndexNumber'] ?? null,
            'episode' => $item['IndexNumber'] ?? null,
            'isFolder' => (bool) ($item['IsFolder'] ?? false),
            'runtime' => Ticks::toSeconds($item['RunTimeTicks'] ?? null),
            'rating' => isset($item['CommunityRating']) ? round((float) $item['CommunityRating'], 1) : null,
            'poster' => Image::of($item, 'Primary', 480),
            'aspect' => isset($item['PrimaryImageAspectRatio']) ? round((float) $item['PrimaryImageAspectRatio'], 3) : null,
            'landscape' => $this->landscape($item),
            'played' => (bool) data_get($item, 'UserData.Played', false),
            'favorite' => (bool) data_get($item, 'UserData.IsFavorite', false),
            'progress' => $this->progress($item),
            'unplayed' => data_get($item, 'UserData.UnplayedItemCount'),
            'childCount' => $item['ChildCount'] ?? $item['RecursiveItemCount'] ?? null,
        ];
    }

    /**
     * Горизонтальная картинка: у серии — её кадр, у фильма — Thumb или фон.
     *
     * @param  array<string, mixed>  $item
     */
    private function landscape(array $item): ?string
    {
        if ($item['Type'] === 'Episode') {
            return Image::of($item, 'Primary', 640) ?? Image::of($item, 'Thumb', 640);
        }

        return Image::of($item, 'Thumb', 640) ?? Image::of($item, 'Backdrop', 640);
    }

    /**
     * Сколько просмотрено, 0–100; null — не начинали.
     *
     * @param  array<string, mixed>  $item
     */
    private function progress(array $item): ?float
    {
        $percent = data_get($item, 'UserData.PlayedPercentage');

        // У сериала это доля просмотренных серий — для него есть счётчик.
        if (($item['IsFolder'] ?? false) || ! is_numeric($percent) || $percent <= 0 || data_get($item, 'UserData.Played') === true) {
            return null;
        }

        return round((float) $percent, 1);
    }
}
