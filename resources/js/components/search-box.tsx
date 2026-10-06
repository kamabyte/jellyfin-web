import { router, usePage } from '@inertiajs/react';
import { Search, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { search } from '@/routes';

const DEBOUNCE_MS = 300;

function currentQuery(url: string): string {
    return new URL(url, window.location.origin).searchParams.get('q') ?? '';
}

/**
 * Поиск в шапке: ищет по мере набора, без Enter. Первый символ уводит на
 * страницу поиска, дальше она обновляется на месте и не копит историю.
 */
export function SearchBox({
    className,
    autoFocus,
}: {
    className?: string;
    autoFocus?: boolean;
}) {
    const { url } = usePage();
    const onSearchPage = url.startsWith('/search');
    const [value, setValue] = useState(() =>
        onSearchPage ? currentQuery(url) : '',
    );
    const inputRef = useRef<HTMLInputElement>(null);
    const timer = useRef(0);

    // Ушли со страницы поиска — поле очищается.
    useEffect(() => {
        if (!onSearchPage) setValue('');
    }, [onSearchPage]);

    // «/» — фокус на поиск.
    useEffect(() => {
        const onKey = (event: KeyboardEvent) => {
            const target = event.target as HTMLElement;
            if (
                event.key === '/' &&
                !['INPUT', 'TEXTAREA'].includes(target.tagName) &&
                !target.isContentEditable
            ) {
                event.preventDefault();
                inputRef.current?.focus();
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, []);

    const go = (q: string) => {
        window.clearTimeout(timer.current);
        timer.current = window.setTimeout(() => {
            router.visit(search({ query: q.trim() ? { q: q.trim() } : {} }), {
                preserveState: true,
                preserveScroll: true,
                replace: onSearchPage,
            });
        }, DEBOUNCE_MS);
    };

    return (
        <form
            onSubmit={(event) => {
                event.preventDefault();
                go(value);
            }}
            role="search"
            className={cn('relative w-full', className)}
        >
            <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
                ref={inputRef}
                type="search"
                value={value}
                autoFocus={autoFocus}
                onChange={(event) => {
                    setValue(event.target.value);
                    go(event.target.value);
                }}
                placeholder="Фильмы, сериалы, актёры"
                aria-label="Поиск"
                className="h-10 w-full rounded-full border border-transparent bg-white/[0.08] pr-10 pl-10 text-[15px] transition outline-none placeholder:text-muted-foreground focus:border-ring/60 focus:bg-black/40 focus:ring-4 focus:ring-ring/15 [&::-webkit-search-cancel-button]:hidden"
            />
            {value && (
                <button
                    type="button"
                    onClick={() => {
                        setValue('');
                        inputRef.current?.focus();
                    }}
                    className="absolute top-1/2 right-2.5 flex size-6 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground"
                    aria-label="Очистить"
                >
                    <X className="size-3.5" />
                </button>
            )}
        </form>
    );
}
