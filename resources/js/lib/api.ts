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

export function postJson<T = unknown>(
    url: string,
    body: unknown,
    options: { keepalive?: boolean; signal?: AbortSignal } = {},
): Promise<T> {
    return send<T>(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        ...options,
    });
}

export function getJson<T = unknown>(
    url: string,
    options: { signal?: AbortSignal } = {},
): Promise<T> {
    return send<T>(url, { method: 'GET', ...options });
}

async function send<T>(
    url: string,
    init: Omit<RequestInit, 'headers'> & { headers?: Record<string, string> },
): Promise<T> {
    const response = await fetch(url, {
        ...init,
        headers: {
            Accept: 'application/json',
            'X-XSRF-TOKEN': xsrfToken(),
            'X-Requested-With': 'XMLHttpRequest',
            ...init.headers,
        },
        credentials: 'same-origin',
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
