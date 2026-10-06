import { Link, type InertiaLinkProps } from '@inertiajs/react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { type ReactNode, useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

/**
 * Полка — заголовок и горизонтальная лента карточек. Стрелки появляются
 * при наведении, листают на ширину ленты; на телефоне — свайп.
 */
export function Shelf({
    title,
    href,
    children,
    className,
}: {
    title: ReactNode;
    href?: InertiaLinkProps['href'];
    children: ReactNode;
    className?: string;
}) {
    const track = useRef<HTMLDivElement>(null);
    const [edges, setEdges] = useState({ start: true, end: false });

    useEffect(() => {
        const el = track.current;
        if (!el) return;
        const update = () =>
            setEdges({
                start: el.scrollLeft <= 4,
                end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 4,
            });
        update();
        el.addEventListener('scroll', update, { passive: true });
        const observer = new ResizeObserver(update);
        observer.observe(el);
        return () => {
            el.removeEventListener('scroll', update);
            observer.disconnect();
        };
    }, []);

    const page = (direction: 1 | -1) => {
        const el = track.current;
        if (!el) return;
        el.scrollBy({
            left: direction * el.clientWidth * 0.85,
            behavior: 'smooth',
        });
    };

    const arrow =
        'absolute top-0 bottom-10 z-10 hidden w-12 items-center justify-center bg-background/0 text-white opacity-0 transition group-hover/shelf:opacity-100 md:flex [&_svg]:size-8 [&_svg]:drop-shadow-lg';

    return (
        <section className={cn('group/shelf', className)}>
            <div className="mb-3 flex items-baseline justify-between px-4 md:px-8 lg:px-12">
                <h2 className="font-display text-xl font-semibold md:text-2xl">
                    {href ? (
                        <Link
                            href={href}
                            className="inline-flex items-center gap-1 hover:text-white/80"
                        >
                            {title}
                            <ChevronRight className="size-5 text-muted-foreground" />
                        </Link>
                    ) : (
                        title
                    )}
                </h2>
            </div>
            <div className="relative">
                {!edges.start && (
                    <button
                        type="button"
                        onClick={() => page(-1)}
                        className={cn(
                            arrow,
                            'left-0 bg-linear-to-r from-background/90 to-transparent',
                        )}
                        aria-label="Назад"
                    >
                        <ChevronLeft />
                    </button>
                )}
                <div
                    ref={track}
                    className="scrollbar-none flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4 pt-1 pb-2 md:scroll-px-8 md:gap-4 md:px-8 lg:scroll-px-12 lg:px-12"
                >
                    {children}
                </div>
                {!edges.end && (
                    <button
                        type="button"
                        onClick={() => page(1)}
                        className={cn(
                            arrow,
                            'right-0 bg-linear-to-l from-background/90 to-transparent',
                        )}
                        aria-label="Вперёд"
                    >
                        <ChevronRight />
                    </button>
                )}
            </div>
        </section>
    );
}

/** Ширина элемента полки: постеры уже, горизонтальные карточки шире. */
export const SHELF_POSTER = 'w-[38vw] shrink-0 snap-start sm:w-44 lg:w-48';
export const SHELF_LANDSCAPE = 'w-[72vw] shrink-0 snap-start sm:w-72 lg:w-80';
