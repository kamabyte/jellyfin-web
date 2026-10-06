import { Link } from '@inertiajs/react';
import { ChevronLeft, ChevronRight, Info, Play } from 'lucide-react';
import { type CSSProperties, useRef, useState } from 'react';
import { ItemMeta } from '@/components/item-meta';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { watch } from '@/routes';
import items from '@/routes/items';
import type { ItemDetail } from '@/types';

const ROTATE_MS = 9000;
const SWIPE_PX = 50;

/** Задержка появления элементов слайда — по очереди, сверху вниз. */
const stagger = (step: number): CSSProperties => ({
    animationDelay: `${120 + step * 90}ms`,
});

/**
 * Витрина главной: свежие фильмы и сериалы во весь экран. Листается
 * стрелками, свайпом и ←/→; сама — по полосе времени
 * (её конец и переключает слайд), пока на витрину не навели.
 */
export function Hero({ slides }: { slides: ItemDetail[] }) {
    const [index, setIndex] = useState(0);
    const [direction, setDirection] = useState<1 | -1>(1);
    const [paused, setPaused] = useState(false);
    const touchStart = useRef<number | null>(null);
    const slide = slides[index];
    const many = slides.length > 1;

    const go = (target: number, dir?: 1 | -1) => {
        const next = (target + slides.length) % slides.length;
        if (next === index) return;
        setDirection(dir ?? (target > index ? 1 : -1));
        setIndex(next);
    };
    const step = (dir: 1 | -1) => go(index + dir, dir);

    if (!slide) return null;

    return (
        <section
            className="group/hero relative isolate h-[80svh] min-h-[30rem] w-full overflow-hidden outline-none md:h-[88svh] md:max-h-[58rem]"
            aria-roledescription="карусель"
            aria-label="Новинки"
            tabIndex={-1}
            onPointerEnter={(event) =>
                event.pointerType === 'mouse' && setPaused(true)
            }
            onPointerLeave={(event) =>
                event.pointerType === 'mouse' && setPaused(false)
            }
            onKeyDown={(event) => {
                if (event.key === 'ArrowLeft') step(-1);
                if (event.key === 'ArrowRight') step(1);
            }}
            onTouchStart={(event) => {
                touchStart.current = event.touches[0].clientX;
            }}
            onTouchEnd={(event) => {
                if (touchStart.current === null) return;
                const dx = event.changedTouches[0].clientX - touchStart.current;
                touchStart.current = null;
                if (Math.abs(dx) > SWIPE_PX) step(dx < 0 ? 1 : -1);
            }}
        >
            {/* Фоны: текущий поверх, прежний гаснет под ним. */}
            {slides.map((item, position) => {
                const active = position === index;

                return (
                    <div
                        key={item.id}
                        aria-hidden={!active}
                        className={cn(
                            'absolute inset-0 transition-opacity duration-[1400ms] ease-out',
                            active ? 'z-[1] opacity-100' : 'z-0 opacity-0',
                        )}
                    >
                        {item.backdrop && (
                            <img
                                key={active ? `${item.id}-${index}` : item.id}
                                src={item.backdrop}
                                alt=""
                                style={
                                    {
                                        '--hero-shift': `${direction * 4}%`,
                                    } as CSSProperties
                                }
                                className={cn(
                                    'size-full object-cover object-[center_20%]',
                                    active &&
                                        'motion-safe:animate-hero-backdrop',
                                )}
                                fetchPriority={position === 0 ? 'high' : 'low'}
                                loading={position === 0 ? 'eager' : 'lazy'}
                            />
                        )}
                    </div>
                );
            })}

            <div className="absolute inset-0 z-[2] bg-linear-to-t from-background via-background/25 to-transparent" />
            <div className="absolute inset-0 z-[2] bg-linear-to-r from-background/95 via-background/45 to-transparent md:via-background/25" />
            <div className="absolute inset-x-0 top-0 z-[2] h-40 bg-linear-to-b from-black/60 to-transparent" />

            {/* Слайд: название, сведения, описание, кнопки — по очереди. */}
            <div className="absolute inset-x-0 bottom-0 z-[3] px-4 pb-16 md:px-8 md:pb-24 lg:px-12">
                <div key={slide.id} className="max-w-2xl">
                    <div
                        className="motion-safe:animate-hero-in"
                        style={stagger(0)}
                    >
                        {slide.logo ? (
                            <img
                                src={slide.logo}
                                alt={slide.name}
                                className="mb-5 max-h-28 max-w-[min(80%,26rem)] object-contain object-left drop-shadow-2xl md:max-h-40"
                            />
                        ) : (
                            <h1 className="mb-4 font-display text-4xl font-bold text-balance drop-shadow-lg md:text-6xl">
                                {slide.name}
                            </h1>
                        )}
                    </div>
                    <div
                        className="motion-safe:animate-hero-in"
                        style={stagger(1)}
                    >
                        <ItemMeta item={slide} className="mb-4" />
                    </div>
                    {slide.overview && (
                        <p
                            className="mb-7 line-clamp-3 max-w-xl text-[15px] leading-relaxed text-white/80 motion-safe:animate-hero-in md:text-base"
                            style={stagger(2)}
                        >
                            {slide.overview}
                        </p>
                    )}
                    <div
                        className="flex flex-wrap gap-3 motion-safe:animate-hero-in"
                        style={stagger(3)}
                    >
                        <Button
                            asChild
                            size="lg"
                            className="h-12 rounded-full px-7 text-base font-semibold shadow-lg shadow-black/30"
                        >
                            <Link href={watch(slide.id)}>
                                <Play className="size-5 fill-current" />
                                {slide.resumeAt ? 'Продолжить' : 'Смотреть'}
                            </Link>
                        </Button>
                        <Button
                            asChild
                            size="lg"
                            variant="secondary"
                            className="h-12 rounded-full bg-white/15 px-6 text-base font-semibold text-white ring-1 ring-white/15 backdrop-blur-md hover:bg-white/25"
                        >
                            <Link href={items.show(slide.id)} prefetch>
                                <Info className="size-5" />
                                Подробнее
                            </Link>
                        </Button>
                    </div>
                </div>

                {/* Управление: стрелки, номер слайда и полосы времени. */}
                {many && (
                    <div className="mt-8 flex items-center gap-3 md:mt-10">
                        <HeroArrow label="Предыдущий" onClick={() => step(-1)}>
                            <ChevronLeft />
                        </HeroArrow>
                        <HeroArrow label="Следующий" onClick={() => step(1)}>
                            <ChevronRight />
                        </HeroArrow>
                        <span className="ml-1 shrink-0 text-sm font-medium whitespace-nowrap text-white/70 tabular-nums">
                            {String(index + 1).padStart(2, '0')}
                            <span className="text-white/40">
                                {' '}
                                / {String(slides.length).padStart(2, '0')}
                            </span>
                        </span>
                        <div className="flex w-full max-w-xs gap-1.5">
                            {slides.map((item, position) => (
                                <button
                                    key={item.id}
                                    type="button"
                                    onClick={() => go(position)}
                                    aria-label={`Слайд ${position + 1}: ${item.name}`}
                                    aria-current={position === index}
                                    className="group/seg relative h-6 flex-1"
                                >
                                    <span className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 overflow-hidden rounded-full bg-white/25 transition-[height] group-hover/seg:h-1.5">
                                        <span
                                            key={
                                                position === index
                                                    ? `${item.id}-${index}`
                                                    : item.id
                                            }
                                            className={cn(
                                                'absolute inset-0 origin-left rounded-full bg-white',
                                                position < index &&
                                                    'scale-x-100',
                                                position > index && 'scale-x-0',
                                                position === index &&
                                                    'animate-progress',
                                            )}
                                            style={
                                                position === index
                                                    ? {
                                                          animationDuration: `${ROTATE_MS}ms`,
                                                          animationPlayState:
                                                              paused
                                                                  ? 'paused'
                                                                  : 'running',
                                                      }
                                                    : undefined
                                            }
                                            onAnimationEnd={
                                                position === index
                                                    ? () => step(1)
                                                    : undefined
                                            }
                                        />
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </section>
    );
}

function HeroArrow({
    label,
    onClick,
    children,
}: {
    label: string;
    onClick: () => void;
    children: React.ReactNode;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            aria-label={label}
            className="inline-flex size-12 shrink-0 items-center justify-center rounded-full bg-white/10 text-white ring-1 ring-white/20 backdrop-blur-md transition hover:scale-105 hover:bg-white/20 active:scale-95 [&_svg]:size-6"
        >
            {children}
        </button>
    );
}
