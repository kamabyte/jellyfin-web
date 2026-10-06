import { Form, Head, router } from '@inertiajs/react';
import { KeyRound, LoaderCircle, MonitorSmartphone } from 'lucide-react';
import { useEffect } from 'react';
import { InputError } from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { store } from '@/routes/login';
import quickConnect from '@/routes/login/quick-connect';

const POLL_MS = 3000;

/**
 * Код Quick Connect: его вводят на устройстве, где уже вошли. Страница
 * сама спрашивает сервер, подтвердили ли вход.
 */
function QuickConnectCode({ code }: { code: string }) {
    useEffect(() => {
        const timer = window.setInterval(() => {
            router.post(
                quickConnect.check(),
                {},
                {
                    preserveScroll: true,
                    preserveState: true,
                    showProgress: false,
                },
            );
        }, POLL_MS);
        return () => window.clearInterval(timer);
    }, []);

    return (
        <div className="flex flex-col items-center gap-5 text-center">
            <p className="text-sm text-muted-foreground">
                Откройте Jellyfin на устройстве, где вы уже вошли, — меню
                пользователя → «Подключить устройство» (или Quick Connect в
                настройках) — и введите код:
            </p>
            <div
                className="flex gap-2 font-mono text-4xl font-semibold tracking-widest tabular-nums"
                aria-label={`Код ${code.split('').join(' ')}`}
            >
                {code.split('').map((digit, index) => (
                    <span
                        key={index}
                        className="flex h-16 w-11 items-center justify-center rounded-xl bg-white/[0.08] ring-1 ring-white/10"
                    >
                        {digit}
                    </span>
                ))}
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <LoaderCircle className="size-4 animate-spin" />
                Ждём подтверждения…
            </div>
            <Button
                variant="ghost"
                onClick={() =>
                    router.visit(quickConnect.destroy(), {
                        preserveScroll: true,
                    })
                }
            >
                Войти по паролю
            </Button>
        </div>
    );
}

export default function Login({
    serverName,
    quickConnectEnabled,
    quickConnectCode,
}: {
    serverName: string | null;
    quickConnectEnabled: boolean;
    quickConnectCode: string | null;
}) {
    return (
        <>
            <Head title="Вход" />

            <div className="rounded-3xl border border-white/10 bg-card/70 p-7 shadow-2xl shadow-black/40 backdrop-blur-xl">
                <div className="mb-6 text-center">
                    <h1 className="font-display text-2xl font-semibold">
                        Вход
                    </h1>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Учётная запись Jellyfin
                        {serverName && (
                            <>
                                {' '}
                                на сервере{' '}
                                <span className="text-foreground">
                                    {serverName}
                                </span>
                            </>
                        )}
                    </p>
                </div>

                {quickConnectCode ? (
                    <QuickConnectCode code={quickConnectCode} />
                ) : (
                    <Form
                        {...store.form()}
                        resetOnSuccess={['password']}
                        className="flex flex-col gap-5"
                    >
                        {({ processing, errors }) => (
                            <>
                                <div className="grid gap-2">
                                    <Label htmlFor="username">
                                        Имя пользователя
                                    </Label>
                                    <Input
                                        id="username"
                                        name="username"
                                        required
                                        autoFocus
                                        autoComplete="username"
                                        autoCapitalize="none"
                                        className="h-11"
                                    />
                                    <InputError message={errors.username} />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="password">Пароль</Label>
                                    <Input
                                        id="password"
                                        name="password"
                                        type="password"
                                        autoComplete="current-password"
                                        className="h-11"
                                    />
                                    <InputError message={errors.password} />
                                </div>
                                <Button
                                    type="submit"
                                    size="lg"
                                    className="mt-1 h-11 rounded-xl font-semibold"
                                    disabled={processing}
                                >
                                    {processing ? (
                                        <LoaderCircle className="animate-spin" />
                                    ) : (
                                        <KeyRound />
                                    )}
                                    Войти
                                </Button>
                            </>
                        )}
                    </Form>
                )}

                {quickConnectEnabled && !quickConnectCode && (
                    <>
                        <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
                            <div className="h-px flex-1 bg-border" />
                            или
                            <div className="h-px flex-1 bg-border" />
                        </div>
                        <Button
                            variant="secondary"
                            size="lg"
                            className="h-11 w-full rounded-xl"
                            onClick={() =>
                                router.visit(quickConnect.store(), {
                                    preserveScroll: true,
                                })
                            }
                        >
                            <MonitorSmartphone />
                            Войти по коду с другого устройства
                        </Button>
                    </>
                )}
            </div>
        </>
    );
}
