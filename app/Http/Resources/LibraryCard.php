<?php

namespace App\Http\Resources;

use App\Jellyfin\BuiltInClient;
use App\Jellyfin\Image;
use App\Jellyfin\LibraryKind;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Медиатека в меню и на главной. Внешние (музыка, ТВ) ведут во встроенный
 * клиент — для них заполнен externalUrl.
 *
 * @property array<string, mixed> $resource
 */
class LibraryCard extends JsonResource
{
    /**
     * Служебные разделы Jellyfin называет сам и по-английски — их
     * переводим; медиатеки, созданные вручную, остаются как назвали.
     */
    private const array SYSTEM_NAMES = [
        'boxsets' => 'Коллекции',
    ];

    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $view = $this->resource;
        $kind = LibraryKind::of($view);

        return [
            'id' => (string) $view['Id'],
            'name' => self::SYSTEM_NAMES[$view['CollectionType'] ?? ''] ?? (string) $view['Name'],
            'kind' => $kind->value,
            'collectionType' => $view['CollectionType'] ?? null,
            'image' => Image::of($view, 'Primary', 640),
            'externalUrl' => $kind === LibraryKind::External ? BuiltInClient::library($view) : null,
        ];
    }
}
