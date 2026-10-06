import { Link, usePage } from '@inertiajs/react';
import {
    ExternalLink,
    LayoutDashboard,
    LogOut,
    MonitorSmartphone,
    Settings,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { initials } from '@/lib/format';
import { logout, quickConnect } from '@/routes';

/**
 * Меню пользователя. Всё служебное — панель управления, настройки профиля —
 * открывается во встроенном клиенте Jellyfin в новой вкладке.
 */
export function UserMenu() {
    const { auth, builtIn } = usePage().props;
    const user = auth.user;

    if (!user || !builtIn) return null;

    return (
        <DropdownMenu>
            <DropdownMenuTrigger
                className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label="Меню пользователя"
            >
                <Avatar className="size-9 ring-1 ring-white/15">
                    {user.avatar && <AvatarImage src={user.avatar} alt="" />}
                    <AvatarFallback className="bg-linear-to-br from-[#aa5cc3]/80 to-[#00a4dc]/80 text-sm font-semibold text-white">
                        {initials(user.name)}
                    </AvatarFallback>
                </Avatar>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
                <DropdownMenuLabel className="font-normal">
                    <div className="truncate font-semibold">{user.name}</div>
                    <div className="text-xs text-muted-foreground">
                        {user.isAdmin ? 'Администратор' : 'Пользователь'}
                    </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                    <Link href={quickConnect()}>
                        <MonitorSmartphone />
                        Подключить устройство
                    </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                    <a
                        href={builtIn.preferences}
                        target="_blank"
                        rel="noreferrer"
                    >
                        <Settings />
                        Настройки профиля
                        <ExternalLink className="ml-auto size-3.5 opacity-60" />
                    </a>
                </DropdownMenuItem>
                {builtIn.dashboard && (
                    <DropdownMenuItem asChild>
                        <a
                            href={builtIn.dashboard}
                            target="_blank"
                            rel="noreferrer"
                        >
                            <LayoutDashboard />
                            Панель управления
                            <ExternalLink className="ml-auto size-3.5 opacity-60" />
                        </a>
                    </DropdownMenuItem>
                )}
                <DropdownMenuItem asChild>
                    <a href={builtIn.home} target="_blank" rel="noreferrer">
                        <ExternalLink />
                        Стандартный клиент Jellyfin
                    </a>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                    <Link href={logout()} as="button" className="w-full">
                        <LogOut />
                        Выйти
                    </Link>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
