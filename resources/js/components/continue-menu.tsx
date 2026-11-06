import { Link, router } from '@inertiajs/react';
import { Check, Info, Tv, X } from 'lucide-react';
import {
    DropdownMenuItem,
    DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import items from '@/routes/items';
import type { Item } from '@/types';

/**
 * Меню карточки в «Продолжить просмотр» и «Следующие серии». Во встроенном
 * клиенте Jellyfin с полки можно только отметить просмотренным; здесь ещё
 * и убрать из «Продолжить просмотр», не трогая отметку и счётчик просмотров.
 * После действия перезагружаем только сами полки.
 */
export function ContinueMenu({
    item,
    resume = false,
}: {
    item: Item;
    /** Карточка из «Продолжить просмотр» — можно убрать оттуда. */
    resume?: boolean;
}) {
    const visit = (route: { url: string; method: 'post' | 'delete' }) =>
        router.visit(route, {
            preserveScroll: true,
            preserveState: true,
            only: ['resume', 'nextUp'],
        });

    const seriesId = item.type === 'Episode' ? item.seriesId : null;

    return (
        <>
            {!item.played && (
                <DropdownMenuItem
                    onSelect={() => visit(items.played.store(item.id))}
                >
                    <Check />
                    Отметить просмотренным
                </DropdownMenuItem>
            )}
            {resume && (
                <DropdownMenuItem
                    onSelect={() => visit(items.resume.destroy(item.id))}
                >
                    <X />
                    Убрать из «Продолжить просмотр»
                </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            {seriesId ? (
                <DropdownMenuItem asChild>
                    <Link href={items.show(seriesId)}>
                        <Tv />
                        Страница сериала
                    </Link>
                </DropdownMenuItem>
            ) : (
                <DropdownMenuItem asChild>
                    <Link href={items.show(item.id)}>
                        <Info />
                        Подробнее
                    </Link>
                </DropdownMenuItem>
            )}
        </>
    );
}
