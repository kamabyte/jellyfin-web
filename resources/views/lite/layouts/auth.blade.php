@php
    use App\Lite\Icon;
@endphp
@extends('lite.layouts.base')

@section('body-class', 'body--auth')

@section('body')
    <div class="auth">
        <div class="auth__glow auth__glow--violet" aria-hidden="true"></div>
        <div class="auth__glow auth__glow--blue" aria-hidden="true"></div>
        <div class="auth__box">
            <div class="auth__mark"><span class="logo__mark logo__mark--lg">{{ Icon::svg('play', 'icon--lg', fill: true) }}</span></div>
            @yield('content')
        </div>
    </div>
@endsection
