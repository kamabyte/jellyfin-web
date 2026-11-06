@php
    use App\Lite\Icon;
@endphp
@extends('lite.layouts.app')

@section('title', 'Подключить устройство')

@section('content')
    <div class="px">
        <div class="panel panel--center">
            <div class="panel__icon">{{ Icon::svg('monitor-smartphone', 'icon--lg') }}</div>
            <h1 class="panel__title">Подключить устройство</h1>
            <p class="panel__text">Выберите на телевизоре или телефоне «Quick Connect» и введите показанный код — там выполнится вход под вашим именем.</p>
            <form method="post" action="{{ route('quick-connect.store') }}" class="form">
                @csrf
                <input type="text" name="code" class="input input--code" inputmode="numeric" pattern="[0-9]*" maxlength="6"
                       autocomplete="one-time-code" placeholder="••••••" aria-label="Код" required autofocus>
                @error('code')
                    <p class="field-error">{{ $message }}</p>
                @enderror
                <button type="submit" class="btn btn--primary btn--block">Подключить</button>
            </form>
        </div>
    </div>
@endsection
