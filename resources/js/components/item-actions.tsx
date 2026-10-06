import { Link, router } from '@inertiajs/react';
import {
    Check,
    ExternalLink,
    Heart,
    MoreHorizontal,
    Play,
    RotateCcw,
    MonitorPlay,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { formatDuration } from '@/lib/format';
import { cn } from '@/lib/utils';
import { watch } from '@/routes';
import items from '@/routes/items';
import type { ItemDetail } from '@/types';

function RoundButton({
    label,
    active = false,
    onClick,
    children,
}: {
    label: string;
    active?: boolean;
    onClick: () => void;
    children: ReactNode;
}) {
    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <button
                    type="button"
                    onClick={onClick}
                    aria-label={label}
                    aria-pressed={active}
                    className={cn(
                        'inline-flex size-12 items-center justify-center rounded-full bg-white/12 text-white backdrop-blur-md transition hover:bg-white/22 [&_svg]:size-5',
                        active && 'text-brand',
                    )}
                >
                    {children}
                </button>
            </TooltipTrigger>
            <TooltipContent>{label}</TooltipContent>
        </Tooltip>
    );
}

/**
 * Кнопки под заголовком: смотреть (или продолжить), с начала, отметки
 * «просмотрено» и «избранное», трейлер, встроенный клиент.
 */
export function ItemActions({
    item,
    playId = item.id,
    playLabel,
}: {
    item: ItemDetail;
    /** Что запускать: у сериала — следующую серию. */
    playId?: string;
    playLabel?: string;
}) {
    const toggle = (
        route: typeof items.played | typeof items.favorite,
        on: boolean,
    ) =>
        router.visit(on ? route.destroy(item.id) : route.store(item.id), {
            preserveScroll: true,
        });

    const resumed = playId === item.id && item.resumeAt;

    return (
        <div className="flex flex-wrap items-center gap-3">
            <Button
                asChild
                size="lg"
                className="h-12 rounded-full px-7 text-base font-semibold"
            >
                <Link href={watch(playId)}>
                    <Play className="size-5 fill-current" />
                    {playLabel ??
                        (resumed
                            ? `Продолжить с ${formatDuration(item.resumeAt!)}`
                            : 'Смотреть')}
                </Link>
            </Button>

            {resumed && (
                <RoundButton
                    label="С начала"
                    onClick={() =>
                        router.visit(watch(item.id, { query: { t: 0 } }))
                    }
                >
                    <RotateCcw />
                </RoundButton>
            )}

            <RoundButton
                label={
                    item.played
                        ? 'Отметить непросмотренным'
                        : 'Отметить просмотренным'
                }
                active={item.played}
                onClick={() => toggle(items.played, item.played)}
            >
                <Check strokeWidth={item.played ? 3 : 2} />
            </RoundButton>

            <RoundButton
                label={item.favorite ? 'Убрать из избранного' : 'В избранное'}
                active={item.favorite}
                onClick={() => toggle(items.favorite, item.favorite)}
            >
                <Heart className={cn(item.favorite && 'fill-current')} />
            </RoundButton>

            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <button
                        type="button"
                        aria-label="Ещё"
                        className="inline-flex size-12 items-center justify-center rounded-full bg-white/12 text-white backdrop-blur-md transition hover:bg-white/22"
                    >
                        <MoreHorizontal className="size-5" />
                    </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-60">
                    {item.trailer && (
                        <DropdownMenuItem asChild>
                            <a
                                href={item.trailer}
                                target="_blank"
                                rel="noreferrer"
                            >
                                <MonitorPlay />
                                Трейлер
                            </a>
                        </DropdownMenuItem>
                    )}
                    {item.links.map((link) => (
                        <DropdownMenuItem key={link.label} asChild>
                            <a href={link.url} target="_blank" rel="noreferrer">
                                <ExternalLink />
                                {link.label}
                            </a>
                        </DropdownMenuItem>
                    ))}
                    <DropdownMenuItem asChild>
                        <a
                            href={item.builtInUrl}
                            target="_blank"
                            rel="noreferrer"
                        >
                            <ExternalLink />
                            Открыть в стандартном клиенте
                        </a>
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    );
}
