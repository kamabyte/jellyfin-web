<?php

namespace App\Lite;

use Inertia\Response;
use Inertia\ResponseFactory as InertiaResponseFactory;
use Inertia\Support\Header;

/**
 * В облегчённой версии страница приходит целиком с первого запроса: догружать
 * отложенные пропсы (Inertia::defer) некому — React там нет. Для Inertia это
 * частичный запрос той же страницы без списка пропсов: он отдаёт всё, и
 * отложенное тоже.
 */
final class ResponseFactory extends InertiaResponseFactory
{
    public function render($component, $props = []): Response
    {
        $request = request();

        if (is_string($component) && Lite::active($request)) {
            $request->headers->set(Header::PARTIAL_COMPONENT, $component);
        }

        return parent::render($component, $props);
    }
}
