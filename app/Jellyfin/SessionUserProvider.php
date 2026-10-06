<?php

namespace App\Jellyfin;

use Illuminate\Contracts\Auth\Authenticatable;
use Illuminate\Contracts\Auth\UserProvider;
use Illuminate\Contracts\Session\Session;

/**
 * Достаёт вошедшего пользователя из сессии, а не из базы: пароль проверяет
 * Jellyfin при входе, а Laravel только помнит выданный им токен. Поэтому
 * работают обычные middleware auth/guest и $request->user().
 */
class SessionUserProvider implements UserProvider
{
    public const string KEY = 'jellyfin.user';

    public function __construct(private readonly Session $session) {}

    public function retrieveById($identifier): ?JellyfinUser
    {
        /** @var array<string, mixed>|null $data */
        $data = $this->session->get(self::KEY);

        if ($data === null || ($data['id'] ?? null) !== $identifier) {
            return null;
        }

        return JellyfinUser::fromArray($data);
    }

    public function retrieveByToken($identifier, $token): ?Authenticatable
    {
        return null;
    }

    public function updateRememberToken(Authenticatable $user, $token): void {}

    /**
     * @param  array<string, mixed>  $credentials
     */
    public function retrieveByCredentials(array $credentials): ?Authenticatable
    {
        return null;
    }

    /**
     * @param  array<string, mixed>  $credentials
     */
    public function validateCredentials(Authenticatable $user, array $credentials): bool
    {
        return false;
    }

    /**
     * @param  array<string, mixed>  $credentials
     */
    public function rehashPasswordIfRequired(Authenticatable $user, array $credentials, bool $force = false): void {}
}
