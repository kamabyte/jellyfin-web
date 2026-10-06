<?php

use App\Http\Middleware\HandleInertiaRequests;
use App\Jellyfin\JellyfinUnavailable;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Middleware\AddLinkHeadersForPreloadedAssets;
use Illuminate\Http\Request;
use Inertia\ExceptionResponse;
use Inertia\Inertia;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        // Снаружи — только Traefik (порт не публикуется): верим его
        // X-Forwarded-*, иначе за HTTPS ссылки на ассеты получаются http://.
        $middleware->trustProxies(at: '*');

        $middleware->redirectUsersTo('/');

        $middleware->web(append: [
            HandleInertiaRequests::class,
            AddLinkHeadersForPreloadedAssets::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request) => $request->is('api/*') || $request->expectsJson(),
        );

        // Ошибки — страницей в оформлении клиента. Недоступный Jellyfin —
        // штатная ситуация (сервер перезагружается), его показываем и в
        // отладке; прочие 500 в отладке остаются страницей Laravel.
        Inertia::handleExceptionsUsing(function (ExceptionResponse $response) {
            // Плееру (fetch) — JSON, как обычно.
            if ($response->request->expectsJson()) {
                return null;
            }

            $unavailable = $response->exception instanceof JellyfinUnavailable;
            $status = $unavailable ? 503 : $response->statusCode();

            if (! in_array($status, [403, 404, 500, 503], true)) {
                return null;
            }

            if ($status === 500 && config('app.debug')) {
                return null;
            }

            return $response->render('error', ['status' => $status])->withSharedData();
        });
    })->create();
