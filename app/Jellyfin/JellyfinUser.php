<?php

namespace App\Jellyfin;

use Illuminate\Contracts\Auth\Authenticatable;

/**
 * Пользователь Jellyfin, вошедший в этот клиент. Своей таблицы пользователей
 * нет: всё, что нужно, — в сессии (SessionUserProvider), а токен Jellyfin
 * подписывает каждый запрос к серверу от имени этого пользователя.
 */
final readonly class JellyfinUser implements Authenticatable
{
    public function __construct(
        public string $id,
        public string $name,
        public string $token,
        public string $deviceId,
        public bool $isAdmin,
        public ?string $imageTag = null,
    ) {}

    /**
     * Ответ /Users/AuthenticateByName и /Users/AuthenticateWithQuickConnect.
     *
     * @param  array<string, mixed>  $result
     */
    public static function fromAuthentication(array $result, string $deviceId): self
    {
        /** @var array<string, mixed> $user */
        $user = $result['User'];

        return new self(
            id: (string) $user['Id'],
            name: (string) $user['Name'],
            token: (string) $result['AccessToken'],
            deviceId: $deviceId,
            isAdmin: (bool) data_get($user, 'Policy.IsAdministrator', false),
            imageTag: isset($user['PrimaryImageTag']) ? (string) $user['PrimaryImageTag'] : null,
        );
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public static function fromArray(array $data): self
    {
        return new self(
            id: (string) $data['id'],
            name: (string) $data['name'],
            token: (string) $data['token'],
            deviceId: (string) $data['device_id'],
            isAdmin: (bool) $data['is_admin'],
            imageTag: isset($data['image_tag']) ? (string) $data['image_tag'] : null,
        );
    }

    /**
     * @return array{id: string, name: string, token: string, device_id: string, is_admin: bool, image_tag: string|null}
     */
    public function toArray(): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'token' => $this->token,
            'device_id' => $this->deviceId,
            'is_admin' => $this->isAdmin,
            'image_tag' => $this->imageTag,
        ];
    }

    public function getAuthIdentifierName(): string
    {
        return 'id';
    }

    public function getAuthIdentifier(): string
    {
        return $this->id;
    }

    public function getAuthPasswordName(): string
    {
        return 'password';
    }

    public function getAuthPassword(): string
    {
        return '';
    }

    public function getRememberToken(): string
    {
        return '';
    }

    public function setRememberToken($value): void {}

    public function getRememberTokenName(): string
    {
        return '';
    }
}
