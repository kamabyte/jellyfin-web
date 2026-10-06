<?php

use App\Jellyfin\SessionUserProvider;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Http;
use Inertia\Testing\AssertableInertia as Assert;

function fakeLoginPage(): void
{
    Http::fake([
        'jellyfin.test/System/Info/Public' => Http::response(['ServerName' => 'homeserver']),
        'jellyfin.test/QuickConnect/Enabled' => Http::response('true', 200, ['Content-Type' => 'application/json']),
    ]);
}

/** Ответ Jellyfin на успешный вход. */
function jfAuthentication(bool $admin = false): array
{
    return [
        'User' => [
            'Id' => 'user-1',
            'Name' => 'Анна',
            'PrimaryImageTag' => 'avatar',
            'Policy' => ['IsAdministrator' => $admin],
        ],
        'AccessToken' => 'token-1',
    ];
}

it('sends guests to the login page', function (): void {
    $this->get('/')->assertRedirect('/login');
});

it('shows the server name and quick connect on the login page', function (): void {
    fakeLoginPage();

    $this->get('/login')
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('auth/login')
            ->where('serverName', 'homeserver')
            ->where('quickConnectEnabled', true)
            ->where('quickConnectCode', null));
});

it('still shows the login page when Jellyfin is down', function (): void {
    Http::fake(['jellyfin.test/*' => Http::failedConnection()]);

    $this->get('/login')
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->where('serverName', null)
            ->where('quickConnectEnabled', false));
});

it('signs in with a Jellyfin username and password', function (): void {
    Http::fake(['jellyfin.test/Users/AuthenticateByName' => Http::response(jfAuthentication(admin: true))]);

    $this->post('/login', ['username' => 'Анна', 'password' => 'secret'])
        ->assertRedirect('/');

    $this->assertAuthenticated();
    expect(session(SessionUserProvider::KEY))
        ->toMatchArray(['id' => 'user-1', 'token' => 'token-1', 'is_admin' => true]);

    Http::assertSent(fn (Request $request) => $request['Username'] === 'Анна'
        && $request['Pw'] === 'secret'
        // Имя клиента — по-русски, поэтому закодировано.
        && str_contains($request->header('Authorization')[0], 'Client="%D0%9A'));
});

it('rejects a wrong password', function (): void {
    Http::fake(['jellyfin.test/Users/AuthenticateByName' => Http::response(null, 401)]);

    $this->from('/login')
        ->post('/login', ['username' => 'Анна', 'password' => 'wrong'])
        ->assertRedirect('/login')
        ->assertSessionHasErrors(['username' => 'Неверное имя пользователя или пароль.']);

    $this->assertGuest();
});

it('signs in once quick connect is approved on another device', function (): void {
    fakeLoginPage();
    Http::fake([
        'jellyfin.test/QuickConnect/Initiate' => Http::response(['Code' => '123456', 'Secret' => 'secret-1']),
        'jellyfin.test/QuickConnect/Connect*' => Http::sequence()
            ->push(['Authenticated' => false])
            ->push(['Authenticated' => true]),
        'jellyfin.test/Users/AuthenticateWithQuickConnect' => Http::response(jfAuthentication()),
    ]);

    $this->from('/login')->post('/login/quick-connect')->assertRedirect('/login');
    $this->get('/login')->assertInertia(fn (Assert $page) => $page->where('quickConnectCode', '123456'));

    // Пока не подтвердили — остаёмся на странице входа.
    $this->from('/login')->post('/login/quick-connect/check')->assertRedirect('/login');
    $this->assertGuest();

    $this->from('/login')->post('/login/quick-connect/check')->assertRedirect('/');
    $this->assertAuthenticated();
    expect(session('quick-connect.secret'))->toBeNull();
});

it('drops an expired quick connect code', function (): void {
    Http::fake([
        'jellyfin.test/QuickConnect/Initiate' => Http::response(['Code' => '123456', 'Secret' => 'secret-1']),
        'jellyfin.test/QuickConnect/Connect*' => Http::response(null, 404),
    ]);

    $this->post('/login/quick-connect');
    $this->from('/login')->post('/login/quick-connect/check')->assertRedirect('/login');

    expect(session('quick-connect.code'))->toBeNull();
    $this->assertGuest();
});

it('signs out of Jellyfin too', function (): void {
    signIn();
    Http::fake(['jellyfin.test/Sessions/Logout' => Http::response(null, 204)]);

    $this->post('/logout', [], inertiaHeaders())
        ->assertStatus(409)
        ->assertHeader('X-Inertia-Location', url('/login'));

    $this->assertGuest();
    Http::assertSent(fn (Request $request) => str_ends_with($request->url(), '/Sessions/Logout'));
});

it('signs out when Jellyfin revokes the token', function (): void {
    signIn();
    Http::fake(['jellyfin.test/*' => Http::response(null, 401)]);

    $this->get('/')->assertRedirect('/login');

    $this->assertGuest();
});

it('authorizes another device by its quick connect code', function (): void {
    signIn();
    Http::fake(['jellyfin.test/QuickConnect/Authorize*' => Http::response('true', 200, ['Content-Type' => 'application/json'])]);

    $this->from('/quick-connect')
        ->post('/quick-connect', ['code' => '654321'])
        ->assertRedirect('/quick-connect')
        ->assertSessionHasNoErrors();

    Http::assertSent(fn (Request $request) => str_contains($request->url(), 'code=654321')
        && str_contains($request->url(), 'userId=user-1'));
});

it('rejects an unknown quick connect code', function (): void {
    signIn();
    Http::fake(['jellyfin.test/QuickConnect/Authorize*' => Http::response(null, 404)]);

    $this->from('/quick-connect')
        ->post('/quick-connect', ['code' => '000000'])
        ->assertSessionHasErrors(['code' => 'Такого кода нет или он истёк.']);
});

it('sends admins to the built-in dashboard and keeps others out', function (): void {
    Http::fake(['jellyfin.test/UserViews*' => Http::response(jfViews())]);
    signIn(admin: true);
    $this->get('/dashboard')->assertRedirect('https://media.test/web/#/dashboard');

    signIn();
    $this->get('/dashboard')->assertForbidden();
});
