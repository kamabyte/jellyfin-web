import { Head, Link, router } from '@inertiajs/react';
import {
    RefreshCw,
    ServerCrash,
    ShieldX,
    TriangleAlert,
    Unplug,
} from 'lucide-react';
import { EmptyState } from '@/components/empty-state';
import { Button } from '@/components/ui/button';
import { home } from '@/routes';

const MESSAGES: Record<
    number,
    { title: string; description: string; icon: React.ReactNode }
> = {
    403: {
        title: 'Нет доступа',
        description: 'Эта страница доступна только администраторам Jellyfin.',
        icon: <ShieldX />,
    },
    404: {
        title: 'Не найдено',
        description:
            'Такого фильма или страницы нет — возможно, файл удалили из медиатеки.',
        icon: <TriangleAlert />,
    },
    500: {
        title: 'Что-то сломалось',
        description: 'Ошибка на сервере. Попробуйте ещё раз чуть позже.',
        icon: <ServerCrash />,
    },
    503: {
        title: 'Jellyfin недоступен',
        description:
            'Сервер не отвечает — возможно, перезагружается. Обычно это пара минут.',
        icon: <Unplug />,
    },
};

export default function ErrorPage({ status }: { status: number }) {
    const message = MESSAGES[status] ?? MESSAGES[500];

    return (
        <>
            <Head title={message.title} />

            <div className="px-4 md:px-8 lg:px-12">
                <EmptyState
                    icon={message.icon}
                    title={message.title}
                    description={message.description}
                    className="mx-auto max-w-2xl"
                >
                    <div className="mt-3 flex gap-2">
                        {status >= 500 && (
                            <Button
                                variant="secondary"
                                className="rounded-full"
                                onClick={() => router.reload()}
                            >
                                <RefreshCw />
                                Повторить
                            </Button>
                        )}
                        <Button asChild className="rounded-full">
                            <Link href={home()}>На главную</Link>
                        </Button>
                    </div>
                </EmptyState>
            </div>
        </>
    );
}
