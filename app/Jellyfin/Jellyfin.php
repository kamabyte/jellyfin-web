<?php

namespace App\Jellyfin;

use Closure;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\PendingRequest;
use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Http;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

/**
 * REST API Jellyfin от имени вошедшего пользователя (или гостя — для входа).
 * Отдаёт ответы сервера как есть, массивами в PascalCase; во что их
 * превращать для страниц, решают ресурсы в app/Http/Resources.
 *
 * 401 → SessionExpired, 404 → обычная 404, сеть и 5xx → JellyfinUnavailable.
 */
class Jellyfin
{
    /** Поля, без которых не нарисовать карточку. */
    public const string CARD_FIELDS = 'PrimaryImageAspectRatio,ProductionYear,EndDate,ChildCount,RecursiveItemCount';

    public function __construct(
        private readonly string $url,
        private readonly int $timeout,
        private readonly ClientIdentity $identity,
        private readonly ?JellyfinUser $user = null,
    ) {}

    /**
     * Название и версия сервера; доступно без входа.
     *
     * @return array<string, mixed>
     */
    public function publicInfo(): array
    {
        return $this->get('/System/Info/Public');
    }

    /**
     * @throws InvalidCredentials
     */
    public function authenticateByName(string $username, string $password): JellyfinUser
    {
        $response = $this->send(fn (PendingRequest $http) => $http->post('/Users/AuthenticateByName', [
            'Username' => $username,
            'Pw' => $password,
        ]), raw: true);

        if (! $response->successful()) {
            throw new InvalidCredentials;
        }

        return JellyfinUser::fromAuthentication($this->json($response), $this->identity->deviceId);
    }

    public function quickConnectEnabled(): bool
    {
        return $this->send(fn (PendingRequest $http) => $http->get('/QuickConnect/Enabled'))->json() === true;
    }

    public function initiateQuickConnect(): QuickConnectCode
    {
        $result = $this->post('/QuickConnect/Initiate');

        return new QuickConnectCode(code: (string) $result['Code'], secret: (string) $result['Secret']);
    }

    /**
     * Подтвердили ли вход на другом устройстве.
     *
     * @throws InvalidCredentials код истёк или неизвестен
     */
    public function quickConnectAuthorized(string $secret): bool
    {
        try {
            $state = $this->get('/QuickConnect/Connect', ['secret' => $secret]);
        } catch (NotFoundHttpException) {
            throw new InvalidCredentials;
        }

        return (bool) ($state['Authenticated'] ?? false);
    }

    /**
     * @throws InvalidCredentials
     */
    public function authenticateWithQuickConnect(string $secret): JellyfinUser
    {
        $response = $this->send(fn (PendingRequest $http) => $http->post('/Users/AuthenticateWithQuickConnect', [
            'Secret' => $secret,
        ]), raw: true);

        if (! $response->successful()) {
            throw new InvalidCredentials;
        }

        return JellyfinUser::fromAuthentication($this->json($response), $this->identity->deviceId);
    }

    /**
     * Впустить другое устройство (телевизор, телефон) по его коду.
     *
     * @throws InvalidCredentials кода нет или он истёк
     */
    public function authorizeQuickConnect(string $code): void
    {
        $response = $this->send(fn (PendingRequest $http) => $http->post(
            '/QuickConnect/Authorize?'.http_build_query(['code' => $code, 'userId' => $this->userId()]),
        ), raw: true);

        if (! $response->successful() || $response->json() !== true) {
            throw new InvalidCredentials;
        }
    }

    /**
     * Отозвать токен. Ошибки не важны: из клиента выходим в любом случае.
     */
    public function logout(): void
    {
        try {
            $this->request()->post('/Sessions/Logout');
        } catch (ConnectionException) {
            //
        }
    }

    /**
     * Медиатеки пользователя в его порядке.
     *
     * @return list<array<string, mixed>>
     */
    public function views(): array
    {
        return $this->items($this->get('/UserViews', ['userId' => $this->userId()]));
    }

    /**
     * «Продолжить просмотр».
     *
     * @return list<array<string, mixed>>
     */
    public function resume(int $limit): array
    {
        return $this->items($this->get('/UserItems/Resume', [
            'userId' => $this->userId(),
            'limit' => $limit,
            'mediaTypes' => 'Video',
            'fields' => self::CARD_FIELDS,
            'enableImageTypes' => 'Primary,Backdrop,Thumb,Logo',
            'imageTypeLimit' => 1,
        ]));
    }

    /**
     * Следующие серии начатых сериалов, или одного сериала.
     *
     * @return list<array<string, mixed>>
     */
    public function nextUp(int $limit, ?string $seriesId = null): array
    {
        return $this->items($this->get('/Shows/NextUp', array_filter([
            'userId' => $this->userId(),
            'seriesId' => $seriesId,
            'limit' => $limit,
            'fields' => self::CARD_FIELDS.',Overview',
            'enableImageTypes' => 'Primary,Backdrop,Thumb',
            'imageTypeLimit' => 1,
            'enableResumable' => 'false',
            'enableRewatching' => 'false',
        ])));
    }

    /**
     * Новинки медиатеки; серии одного сериала сервер схлопывает в сериал.
     *
     * @return list<array<string, mixed>>
     */
    public function latest(string $parentId, int $limit): array
    {
        /** @var list<array<string, mixed>> $items */
        $items = $this->get('/Items/Latest', [
            'userId' => $this->userId(),
            'parentId' => $parentId,
            'limit' => $limit,
            'fields' => self::CARD_FIELDS.',Overview',
            'enableImageTypes' => 'Primary,Backdrop,Thumb,Logo',
            'imageTypeLimit' => 1,
        ]);

        return $items;
    }

    /**
     * Произвольная выборка /Items: страница элементов и общее число.
     *
     * @param  array<string, scalar|null>  $query
     * @return array{items: list<array<string, mixed>>, total: int}
     */
    public function query(array $query): array
    {
        $result = $this->get('/Items', array_filter(
            ['userId' => $this->userId(), 'enableTotalRecordCount' => 'true', ...$query],
            fn ($value) => $value !== null,
        ));

        return [
            'items' => $this->items($result),
            'total' => (int) ($result['TotalRecordCount'] ?? 0),
        ];
    }

    /**
     * @return list<array<string, mixed>>
     */
    public function people(string $search, int $limit): array
    {
        return $this->items($this->get('/Persons', [
            'userId' => $this->userId(),
            'searchTerm' => $search,
            'limit' => $limit,
        ]));
    }

    /**
     * Жанры медиатеки — для фильтра.
     *
     * @return list<string>
     */
    public function genres(string $parentId, ?string $itemTypes): array
    {
        $genres = $this->items($this->get('/Genres', array_filter([
            'userId' => $this->userId(),
            'parentId' => $parentId,
            'includeItemTypes' => $itemTypes,
            'sortBy' => 'SortName',
        ])));

        return array_map(fn (array $genre): string => (string) $genre['Name'], $genres);
    }

    /**
     * @return array<string, mixed>
     */
    public function item(string $id, string $fields = ''): array
    {
        return $this->get("/Items/{$id}", array_filter([
            'userId' => $this->userId(),
            'fields' => $fields,
        ]));
    }

    /**
     * @return list<array<string, mixed>>
     */
    public function seasons(string $seriesId): array
    {
        return $this->items($this->get("/Shows/{$seriesId}/Seasons", [
            'userId' => $this->userId(),
            'fields' => self::CARD_FIELDS,
        ]));
    }

    /**
     * @return list<array<string, mixed>>
     */
    public function episodes(string $seriesId, ?string $seasonId = null): array
    {
        return $this->items($this->get("/Shows/{$seriesId}/Episodes", array_filter([
            'userId' => $this->userId(),
            'seasonId' => $seasonId,
            'fields' => 'Overview,PrimaryImageAspectRatio',
            'enableImageTypes' => 'Primary,Thumb',
        ])));
    }

    /**
     * @return list<array<string, mixed>>
     */
    public function similar(string $id, int $limit): array
    {
        return $this->items($this->get("/Items/{$id}/Similar", [
            'userId' => $this->userId(),
            'limit' => $limit,
            'fields' => self::CARD_FIELDS,
        ]));
    }

    /**
     * Отметки «пропустить заставку / титры». Сегменты появляются, только если
     * их нашёл плагин; ошибка тут не повод ломать плеер.
     *
     * @return list<array<string, mixed>>
     */
    public function mediaSegments(string $id): array
    {
        try {
            return $this->items($this->get("/MediaSegments/{$id}"));
        } catch (JellyfinUnavailable|NotFoundHttpException) {
            return [];
        }
    }

    /**
     * Как играть файл на этом устройстве: напрямую, с перепаковкой или с
     * транскодированием — решает сервер по профилю устройства.
     *
     * @param  array<string, mixed>  $body
     * @return array<string, mixed>
     */
    public function playbackInfo(string $id, array $body): array
    {
        return $this->post("/Items/{$id}/PlaybackInfo", ['UserId' => $this->userId(), ...$body]);
    }

    /**
     * @param  array<string, mixed>  $body
     */
    public function reportPlayback(PlaybackEvent $event, array $body): void
    {
        $this->post($event->path(), $body);
    }

    /**
     * @return array<string, mixed> новые UserData
     */
    public function setPlayed(string $id, bool $played): array
    {
        $path = "/UserPlayedItems/{$id}?userId={$this->userId()}";

        return $played ? $this->post($path) : $this->delete($path);
    }

    /**
     * @return array<string, mixed> новые UserData
     */
    public function setFavorite(string $id, bool $favorite): array
    {
        $path = "/UserFavoriteItems/{$id}?userId={$this->userId()}";

        return $favorite ? $this->post($path) : $this->delete($path);
    }

    private function userId(): string
    {
        if ($this->user === null) {
            throw new SessionExpired('Запрос к Jellyfin без входа.');
        }

        return $this->user->id;
    }

    /**
     * @param  array<string, mixed>  $query
     * @return array<mixed>
     */
    private function get(string $path, array $query = []): array
    {
        return $this->json($this->send(fn (PendingRequest $http) => $http->get($path, $query)));
    }

    /**
     * @param  array<string, mixed>  $body
     * @return array<mixed>
     */
    private function post(string $path, array $body = []): array
    {
        return $this->json($this->send(fn (PendingRequest $http) => $http->post($path, $body)));
    }

    /**
     * @return array<mixed>
     */
    private function delete(string $path): array
    {
        return $this->json($this->send(fn (PendingRequest $http) => $http->delete($path)));
    }

    /**
     * $raw — вернуть ответ как есть (кроме сетевых ошибок и 5xx): для входа,
     * где 401 значит «неверный пароль», а не «сессия истекла».
     *
     * @param  Closure(PendingRequest): Response  $call
     */
    private function send(Closure $call, bool $raw = false): Response
    {
        try {
            $response = $call($this->request());
        } catch (ConnectionException $e) {
            throw new JellyfinUnavailable($e->getMessage(), previous: $e);
        }

        if ($response->successful() || ($raw && ! $response->serverError())) {
            return $response;
        }

        throw match ($response->status()) {
            401 => new SessionExpired,
            403 => new AccessDeniedHttpException,
            404 => new NotFoundHttpException,
            default => new JellyfinUnavailable("Jellyfin ответил {$response->status()}."),
        };
    }

    private function request(): PendingRequest
    {
        return Http::baseUrl($this->url)
            ->timeout($this->timeout)
            ->connectTimeout(5)
            ->acceptJson()
            ->withHeaders(['Authorization' => $this->identity->header($this->user?->token)]);
    }

    /**
     * @return array<mixed>
     */
    private function json(Response $response): array
    {
        $json = $response->json();

        return is_array($json) ? $json : [];
    }

    /**
     * Список из ответа вида {Items: [...], TotalRecordCount: n}.
     *
     * @param  array<mixed>  $result
     * @return list<array<string, mixed>>
     */
    private function items(array $result): array
    {
        /** @var list<array<string, mixed>> $items */
        $items = $result['Items'] ?? [];

        return $items;
    }
}
