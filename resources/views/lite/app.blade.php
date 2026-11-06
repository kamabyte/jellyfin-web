{{--
    Облегчённая версия (App\Lite\Lite): та же страница Inertia, что получил
    бы React, только нарисованная на сервере. Компонент → Blade-шаблон в
    lite/pages, пропсы → переменные шаблона. Ошибки форм — обычный $errors.
--}}
@include('lite.pages.'.str_replace('/', '.', $page['component']), [
    ...\Illuminate\Support\Arr::except($page['props'], ['errors']),
    'page' => $page,
])
