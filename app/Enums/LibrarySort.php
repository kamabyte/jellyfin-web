<?php

namespace App\Enums;

/**
 * Сортировка сетки медиатеки. Порядок обязан быть устойчивым — сетка
 * подгружается страницами, — поэтому везде добивается SortName.
 */
enum LibrarySort: string
{
    case Added = 'added';
    case Name = 'name';
    case Released = 'released';
    case Rating = 'rating';

    public function label(): string
    {
        return match ($this) {
            self::Added => 'Недавно добавленные',
            self::Name => 'По названию',
            self::Released => 'По дате выхода',
            self::Rating => 'По рейтингу',
        };
    }

    /**
     * Параметры sortBy/sortOrder для /Items. В папках сначала подпапки.
     *
     * @return array{sortBy: string, sortOrder: string}
     */
    public function query(bool $foldersFirst = false): array
    {
        [$by, $order] = match ($this) {
            self::Added => ['DateCreated,SortName', 'Descending,Ascending'],
            self::Name => ['SortName', 'Ascending'],
            self::Released => ['PremiereDate,ProductionYear,SortName', 'Descending,Descending,Ascending'],
            self::Rating => ['CommunityRating,SortName', 'Descending,Ascending'],
        };

        if ($foldersFirst) {
            [$by, $order] = ["IsFolder,{$by}", "Descending,{$order}"];
        }

        return ['sortBy' => $by, 'sortOrder' => $order];
    }

    /**
     * @return list<array{value: string, label: string}>
     */
    public static function options(): array
    {
        return array_map(
            fn (self $sort): array => ['value' => $sort->value, 'label' => $sort->label()],
            self::cases(),
        );
    }
}
