@php
    use App\Lite\Icon;
    $messages = [
        403 => ['Нет доступа', 'Эта страница доступна только администраторам Jellyfin.', 'shield-x'],
        404 => ['Не найдено', 'Такого фильма или страницы нет — возможно, файл удалили из медиатеки.', 'triangle-alert'],
        500 => ['Что-то сломалось', 'Ошибка на сервере. Попробуйте ещё раз чуть позже.', 'server-crash'],
        503 => ['Jellyfin недоступен', 'Сервер не отвечает — возможно, перезагружается. Обычно это пара минут.', 'unplug'],
    ];
    [$title, $description, $icon] = $messages[$status] ?? $messages[500];
@endphp
@extends('lite.layouts.app')

@section('title', $title)

@section('content')
    <div class="px">
        <x-lite.empty :icon="$icon" :title="$title" :description="$description" class="empty--narrow">
            <div class="actions actions--center">
                @if ($status >= 500)
                    <a href="{{ request()->fullUrl() }}" class="btn btn--secondary">{{ Icon::svg('refresh-cw', 'icon--sm') }} Повторить</a>
                @endif
                <a href="{{ route('home') }}" class="btn btn--primary">На главную</a>
            </div>
        </x-lite.empty>
    </div>
@endsection
