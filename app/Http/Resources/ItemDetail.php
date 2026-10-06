<?php

namespace App\Http\Resources;

use App\Jellyfin\BuiltInClient;
use App\Jellyfin\Image;
use App\Jellyfin\Ticks;
use Illuminate\Http\Request;

/**
 * Страница фильма, сериала, серии или папки: всё из карточки плюс описание,
 * актёры, технические сведения о файле и куда продолжить просмотр.
 *
 * @property array<string, mixed> $resource
 */
class ItemDetail extends ItemCard
{
    /** Поля /Items/{id}, которые нужны этой странице. */
    public const string FIELDS = 'Overview,Genres,Studios,People,Taglines,ProviderIds,RemoteTrailers,MediaSources,MediaStreams,ChildCount,RecursiveItemCount,PrimaryImageAspectRatio,EndDate,Status';

    private const int CAST_LIMIT = 24;

    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $item = $this->resource;

        return [
            ...parent::toArray($request),
            'overview' => $item['Overview'] ?? null,
            'tagline' => data_get($item, 'Taglines.0'),
            'genres' => $item['Genres'] ?? [],
            'studios' => array_column($item['Studios'] ?? [], 'Name'),
            'officialRating' => $item['OfficialRating'] ?? null,
            'criticRating' => $item['CriticRating'] ?? null,
            'premiereDate' => $item['PremiereDate'] ?? null,
            'status' => $item['Status'] ?? null,
            'seriesId' => $item['SeriesId'] ?? null,
            'seasonId' => $item['SeasonId'] ?? null,
            'parentId' => $item['ParentId'] ?? null,
            'resumeAt' => Ticks::toSeconds(data_get($item, 'UserData.PlaybackPositionTicks')) ?: null,
            'backdrop' => Image::of($item, 'Backdrop', 1920),
            'logo' => Image::of($item, 'Logo', 800),
            'people' => $this->people($item),
            'media' => $this->media($item),
            'links' => $this->links($item),
            'trailer' => data_get($item, 'RemoteTrailers.0.Url'),
            'builtInUrl' => BuiltInClient::item((string) $item['Id']),
        ];
    }

    /**
     * Режиссёры и сценаристы — первыми, затем актёры по порядку титров.
     *
     * @param  array<string, mixed>  $item
     * @return list<array<string, mixed>>
     */
    private function people(array $item): array
    {
        /** @var list<array<string, mixed>> $people */
        $people = $item['People'] ?? [];

        $crew = array_filter($people, fn (array $person): bool => in_array($person['Type'] ?? null, ['Director', 'Writer'], true));
        $cast = array_filter($people, fn (array $person): bool => ($person['Type'] ?? null) === 'Actor');

        return array_map(fn (array $person): array => [
            'id' => (string) $person['Id'],
            'name' => (string) $person['Name'],
            'role' => match ($person['Type']) {
                'Director' => 'Режиссёр',
                'Writer' => 'Сценарист',
                default => $person['Role'] ?? null,
            },
            'image' => Image::url((string) $person['Id'], 'Primary', $person['PrimaryImageTag'] ?? null, 240),
        ], [...array_slice($crew, 0, 4), ...array_slice($cast, 0, self::CAST_LIMIT)]);
    }

    /**
     * Что за файл: значки «4K · HDR · 5.1» и строка для подробностей.
     *
     * @param  array<string, mixed>  $item
     * @return array<string, mixed>|null
     */
    private function media(array $item): ?array
    {
        /** @var list<array<string, mixed>> $streams */
        $streams = data_get($item, 'MediaSources.0.MediaStreams') ?? $item['MediaStreams'] ?? [];

        $video = collect($streams)->firstWhere('Type', 'Video');
        $audio = collect($streams)->where('Type', 'Audio');

        if ($video === null) {
            return null;
        }

        $width = (int) ($video['Width'] ?? 0);
        $range = (string) ($video['VideoRangeType'] ?? $video['VideoRange'] ?? 'SDR');
        $defaultAudio = $audio->firstWhere('IsDefault', true) ?? $audio->first();

        return [
            'resolution' => match (true) {
                $width >= 3200 => '4K',
                $width >= 1800 => '1080p',
                $width >= 1200 => '720p',
                $width > 0 => 'SD',
                default => null,
            },
            'hdr' => match (true) {
                str_starts_with($range, 'DOVI') => 'Dolby Vision',
                str_starts_with($range, 'HDR10Plus') => 'HDR10+',
                str_starts_with($range, 'HDR'), $range === 'HLG' => 'HDR',
                default => null,
            },
            'videoCodec' => isset($video['Codec']) ? strtoupper((string) $video['Codec']) : null,
            'audio' => $defaultAudio['DisplayTitle'] ?? null,
            'audioTracks' => $audio->count(),
            'subtitles' => collect($streams)->where('Type', 'Subtitle')->count(),
            'container' => data_get($item, 'MediaSources.0.Container'),
            'size' => data_get($item, 'MediaSources.0.Size'),
        ];
    }

    /**
     * @param  array<string, mixed>  $item
     * @return list<array{label: string, url: string}>
     */
    private function links(array $item): array
    {
        $ids = $item['ProviderIds'] ?? [];
        $isShow = in_array($item['Type'], ['Series', 'Season', 'Episode'], true);
        $links = [];

        if (isset($ids['Kinopoisk'])) {
            $links[] = ['label' => 'Кинопоиск', 'url' => "https://www.kinopoisk.ru/film/{$ids['Kinopoisk']}/"];
        }

        if (isset($ids['Imdb'])) {
            $links[] = ['label' => 'IMDb', 'url' => "https://www.imdb.com/title/{$ids['Imdb']}/"];
        }

        if (isset($ids['Tmdb'])) {
            $links[] = ['label' => 'TMDB', 'url' => 'https://www.themoviedb.org/'.($isShow ? 'tv' : 'movie')."/{$ids['Tmdb']}"];
        }

        return $links;
    }
}
