import { Form, Head } from '@inertiajs/react';
import { LoaderCircle, MonitorSmartphone } from 'lucide-react';
import { useState } from 'react';
import { InputError } from '@/components/input-error';
import { Button } from '@/components/ui/button';
import {
    InputOTP,
    InputOTPGroup,
    InputOTPSlot,
} from '@/components/ui/input-otp';
import { store } from '@/routes/quick-connect';

/** Впустить телевизор или телефон по коду с его экрана. */
export default function QuickConnect() {
    const [code, setCode] = useState('');

    return (
        <>
            <Head title="Подключить устройство" />

            <div className="mx-auto max-w-md px-4 pt-6 md:pt-12">
                <div className="rounded-3xl border border-white/10 bg-card/60 p-8 text-center shadow-2xl shadow-black/30">
                    <div className="mx-auto mb-5 flex size-14 items-center justify-center rounded-2xl bg-brand/15 text-brand">
                        <MonitorSmartphone className="size-7" />
                    </div>
                    <h1 className="mb-2 font-display text-2xl font-semibold">
                        Подключить устройство
                    </h1>
                    <p className="mb-7 text-sm text-muted-foreground">
                        Выберите на телевизоре или телефоне «Quick Connect» и
                        введите показанный код — там выполнится вход под вашим
                        именем.
                    </p>

                    <Form
                        {...store.form()}
                        onSuccess={() => setCode('')}
                        className="flex flex-col items-center gap-5"
                    >
                        {({ processing, errors }) => (
                            <>
                                <InputOTP
                                    maxLength={6}
                                    name="code"
                                    value={code}
                                    onChange={setCode}
                                    pattern="^[0-9]+$"
                                    inputMode="numeric"
                                    autoFocus
                                >
                                    <InputOTPGroup>
                                        {Array.from(
                                            { length: 6 },
                                            (_, index) => (
                                                <InputOTPSlot
                                                    key={index}
                                                    index={index}
                                                    className="h-14 w-11 text-2xl"
                                                />
                                            ),
                                        )}
                                    </InputOTPGroup>
                                </InputOTP>
                                <InputError message={errors.code} />
                                <Button
                                    type="submit"
                                    size="lg"
                                    className="h-11 w-full rounded-xl font-semibold"
                                    disabled={processing || code.length !== 6}
                                >
                                    {processing && (
                                        <LoaderCircle className="animate-spin" />
                                    )}
                                    Подключить
                                </Button>
                            </>
                        )}
                    </Form>
                </div>
            </div>
        </>
    );
}
