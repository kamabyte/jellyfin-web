import { Link, usePage } from '@inertiajs/react';
import { ExternalLink, House, Menu, Search } from 'lucide-react';
import { type ReactNode, useEffect, useState } from 'react';
import { libraryIcon } from '@/components/library-icon';
import { Logo } from '@/components/logo';
import { SearchBox } from '@/components/search-box';
import { Button } from '@/components/ui/button';
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from '@/components/ui/sheet';
import { UserMenu } from '@/components/user-menu';
import { cn } from '@/lib/utils';
import { home, search } from '@/routes';
import libraries from '@/routes/libraries';
import type { Library } from '@/types';

/** Ссылка на медиатеку: своя страница или встроенный клиент. */
function LibraryLink({
    library,
    className,
    children,
}: {
    library: Library;
    className?: string;
    children: ReactNode;
}) {
    if (library.externalUrl) {
        return (
            <a
                href={library.externalUrl}
                target="_blank"
                rel="noreferrer"
                className={className}
            >
                {children}
            </a>
        );
    }

    return (
        <Link href={libraries.show(library.id)} prefetch className={className}>
            {children}
        </Link>
    );
}

function useScrolled(): boolean {
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        const update = () => setScrolled(window.scrollY > 24);
        update();
        window.addEventListener('scroll', update, { passive: true });
        return () => window.removeEventListener('scroll', update);
    }, []);

    return scrolled;
}

function Nav() {
    const { url, props } = usePage();
    const items = props.libraries ?? [];
    const link =
        'inline-flex h-9 items-center rounded-full px-3.5 text-[15px] font-medium text-white/75 transition-colors hover:bg-white/10 hover:text-white';
    const active = 'bg-white/12 text-white';

    return (
        <nav
            className="scrollbar-none hidden min-w-0 items-center gap-1 overflow-x-auto lg:flex"
            aria-label="Разделы"
        >
            <Link
                href={home()}
                className={cn(link, url === '/' && active)}
                aria-current={url === '/' ? 'page' : undefined}
            >
                Главная
            </Link>
            {items
                .filter((library) => !library.externalUrl)
                .map((library) => {
                    const current = url.startsWith(`/libraries/${library.id}`);

                    return (
                        <LibraryLink
                            key={library.id}
                            library={library}
                            className={cn(link, 'shrink-0', current && active)}
                        >
                            {library.name}
                        </LibraryLink>
                    );
                })}
        </nav>
    );
}

/** Меню на телефоне и планшете: все медиатеки, включая внешние. */
function MobileMenu() {
    const { props } = usePage();
    const items = props.libraries ?? [];
    const [open, setOpen] = useState(false);
    const row =
        'flex h-11 items-center gap-3 rounded-xl px-3 text-[15px] font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground';

    return (
        <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    className="rounded-full lg:hidden"
                    aria-label="Меню"
                >
                    <Menu className="size-5" />
                </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 gap-0 p-0">
                <SheetHeader className="px-5 pt-5">
                    <SheetTitle asChild>
                        <div>
                            <Logo />
                        </div>
                    </SheetTitle>
                </SheetHeader>
                <nav
                    className="flex flex-col gap-0.5 p-3"
                    onClick={() => setOpen(false)}
                >
                    <Link href={home()} className={row}>
                        <House className="size-5" />
                        Главная
                    </Link>
                    {items.map((library) => {
                        const Icon = libraryIcon(library);

                        return (
                            <LibraryLink
                                key={library.id}
                                library={library}
                                className={row}
                            >
                                <Icon className="size-5" />
                                <span className="flex-1 truncate">
                                    {library.name}
                                </span>
                                {library.externalUrl && (
                                    <ExternalLink className="size-3.5 opacity-50" />
                                )}
                            </LibraryLink>
                        );
                    })}
                </nav>
            </SheetContent>
        </Sheet>
    );
}

/**
 * Каркас страниц: шапка поверх контента. На страницах с большим фоном
 * (overlay) шапка прозрачная, пока не прокрутишь, и контент заходит под неё.
 */
export default function AppLayout({
    overlay = false,
    children,
}: {
    overlay?: boolean;
    children: ReactNode;
}) {
    const scrolled = useScrolled();
    const { props } = usePage();
    const external = (props.libraries ?? []).filter(
        (library) => library.externalUrl,
    );
    const solid = !overlay || scrolled;

    return (
        <div className="min-h-dvh">
            <header
                className={cn(
                    'fixed inset-x-0 top-0 z-30 transition-[background-color,backdrop-filter] duration-300',
                    solid
                        ? 'bg-chrome backdrop-blur-xl backdrop-saturate-150'
                        : 'bg-linear-to-b from-black/70 to-transparent',
                )}
            >
                <div className="flex h-16 items-center gap-3 px-4 md:px-8 lg:px-12">
                    <MobileMenu />
                    <Link
                        href={home()}
                        className="shrink-0 rounded-lg focus-visible:ring-2 focus-visible:ring-ring"
                        aria-label="На главную"
                    >
                        <Logo />
                    </Link>
                    <div className="ml-4 min-w-0 flex-1">
                        <Nav />
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                        <SearchBox className="hidden w-64 md:block xl:w-80" />
                        <Button
                            asChild
                            variant="ghost"
                            size="icon"
                            className="rounded-full md:hidden"
                        >
                            <Link href={search()} aria-label="Поиск">
                                <Search className="size-5" />
                            </Link>
                        </Button>
                        <UserMenu />
                    </div>
                </div>
            </header>

            <main className={cn('pb-16', !overlay && 'pt-20 md:pt-24')}>
                {children}
            </main>

            {external.length > 0 && (
                <footer className="border-t border-border/60 px-4 py-8 text-sm text-muted-foreground md:px-8 lg:px-12">
                    <span className="mr-3">Во встроенном клиенте:</span>
                    {external.map((library) => (
                        <a
                            key={library.id}
                            href={library.externalUrl!}
                            target="_blank"
                            rel="noreferrer"
                            className="mr-4 inline-flex items-center gap-1 hover:text-foreground"
                        >
                            {library.name}
                            <ExternalLink className="size-3" />
                        </a>
                    ))}
                </footer>
            )}
        </div>
    );
}
