/**
 * JSON-запросы плеера мимо Inertia: им не нужна смена страницы, а отчёт
 * об остановке должен уйти даже при закрытии вкладки (keepalive).
 */
/**
 * CSRF — из куки XSRF-TOKEN, как у самой Inertia: Laravel обновляет её с
 * каждым ответом. Токен из <meta> устаревал, стоило сессии смениться без
 * перезагрузки страницы (истекла, сброшена), и плеер получал 419.
 */
function xsrfToken(): string {
    const cookie = document.cookie
        .split('; ')
        .find((entry) => entry.startsWith('XSRF-TOKEN='));

    return cookie ? decodeURIComponent(cookie.slice('XSRF-TOKEN='.length)) : '';
}

export class ApiError extends Error {
    constructor(
        message: string,
        public readonly status: number,
    ) {
        super(message);
    }
}

export async function postJson<T = unknown>(
    url: string,
    body: unknown,
    options: { keepalive?: boolean; signal?: AbortSignal } = {},
): Promise<T> {
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            'X-XSRF-TOKEN': xsrfToken(),
            'X-Requested-With': 'XMLHttpRequest',
        },
        body: JSON.stringify(body),
        credentials: 'same-origin',
        keepalive: options.keepalive,
        signal: options.signal,
    });

    if (response.status === 401) {
        // Сессия Jellyfin истекла — на страницу входа.
        window.location.reload();
        throw new ApiError('Сессия истекла', 401);
    }

    if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as {
            message?: string;
        };
        throw new ApiError(data.message ?? 'Ошибка сервера', response.status);
    }

    return response.status === 204
        ? (undefined as T)
        : ((await response.json()) as T);
}
