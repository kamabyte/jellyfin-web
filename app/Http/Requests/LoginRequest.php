<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Вход именем и паролем пользователя Jellyfin. Пароль может быть пустым —
 * в Jellyfin бывают пользователи без пароля.
 */
class LoginRequest extends FormRequest
{
    /**
     * @return array<string, list<string>>
     */
    public function rules(): array
    {
        return [
            'username' => ['required', 'string', 'max:255'],
            'password' => ['nullable', 'string', 'max:255'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'username.required' => 'Введите имя пользователя.',
        ];
    }

    public function username(): string
    {
        return $this->string('username')->toString();
    }

    public function password(): string
    {
        return $this->string('password')->toString();
    }
}
