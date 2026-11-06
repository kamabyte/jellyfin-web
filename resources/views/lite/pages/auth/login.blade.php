@php
    use App\Lite\Icon;
@endphp
@extends('lite.layouts.auth')

@section('title', 'Вход')

@section('content')
    <div class="auth__card" data-swap="login">
        <div class="auth__head">
            <h1 class="auth__title">Вход</h1>
            <p class="auth__text">Учётная запись Jellyfin @if ($serverName) на сервере <span class="auth__server">{{ $serverName }}</span>@endif</p>
        </div>

        @if ($quickConnectCode)
            {{-- Код вводят на устройстве, где уже вошли; страница сама спрашивает, подтвердили ли. --}}
            <div class="qc" data-quick-connect="{{ route('login.quick-connect.check') }}">
                <p class="auth__text">Откройте Jellyfin на устройстве, где вы уже вошли, — меню пользователя → «Подключить устройство» (или Quick Connect в настройках) — и введите код:</p>
                <div class="qc__code" aria-label="Код {{ implode(' ', str_split($quickConnectCode)) }}">
                    @foreach (str_split($quickConnectCode) as $digit)
                        <span class="qc__digit">{{ $digit }}</span>
                    @endforeach
                </div>
                <div class="qc__wait">{{ Icon::svg('loader-circle', 'icon--sm spin') }} Ждём подтверждения…</div>
                <form method="post" action="{{ route('login.quick-connect.destroy') }}">
                    @csrf
                    @method('DELETE')
                    <button type="submit" class="btn btn--ghost">Войти по паролю</button>
                </form>
            </div>
        @else
            <form method="post" action="{{ route('login.store') }}" class="form">
                @csrf
                <label class="field">
                    <span class="field__label">Имя пользователя</span>
                    <input type="text" name="username" value="{{ old('username') }}" class="input" required autofocus
                           autocomplete="username" autocapitalize="none" autocorrect="off">
                </label>
                @error('username')
                    <p class="field-error">{{ $message }}</p>
                @enderror
                <label class="field">
                    <span class="field__label">Пароль</span>
                    <input type="password" name="password" class="input" autocomplete="current-password">
                </label>
                @error('password')
                    <p class="field-error">{{ $message }}</p>
                @enderror
                <button type="submit" class="btn btn--primary btn--block">{{ Icon::svg('key-round', 'icon--sm') }} Войти</button>
            </form>

            @if ($quickConnectEnabled)
                <div class="divider"><span>или</span></div>
                <form method="post" action="{{ route('login.quick-connect.store') }}">
                    @csrf
                    <button type="submit" class="btn btn--secondary btn--block">{{ Icon::svg('monitor-smartphone', 'icon--sm') }} Войти по коду с другого устройства</button>
                </form>
            @endif
        @endif
    </div>
@endsection
