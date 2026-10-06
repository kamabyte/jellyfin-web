<?php

namespace App\Http\Controllers;

use App\Jellyfin\InvalidCredentials;
use App\Jellyfin\Jellyfin;
use App\Support\Toast;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Впустить другое устройство (телевизор, телефон) кодом с его экрана —
 * от имени того, кто вошёл здесь.
 */
class QuickConnectController extends Controller
{
    public function show(): Response
    {
        return Inertia::render('quick-connect');
    }

    public function store(Request $request, Jellyfin $jellyfin): RedirectResponse
    {
        $code = $request->validate(
            ['code' => ['required', 'string', 'regex:/^\d{6}$/']],
            ['code.required' => 'Введите код.', 'code.regex' => 'Код — шесть цифр.'],
        )['code'];

        try {
            $jellyfin->authorizeQuickConnect($code);
        } catch (InvalidCredentials) {
            throw ValidationException::withMessages(['code' => 'Такого кода нет или он истёк.']);
        }

        Toast::success('Устройство подключено', 'На нём выполнен вход под вашим именем.');

        return back();
    }
}
