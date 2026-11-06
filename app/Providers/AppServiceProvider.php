<?php

namespace App\Providers;

use App\Jellyfin\ClientIdentity;
use App\Jellyfin\DeviceId;
use App\Jellyfin\Jellyfin;
use App\Jellyfin\JellyfinUser;
use App\Jellyfin\SessionUserProvider;
use App\Lite\ResponseFactory as LiteResponseFactory;
use Carbon\CarbonImmutable;
use Illuminate\Contracts\Foundation\Application;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Date;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\ServiceProvider;
use Inertia\ResponseFactory;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        // Клиент Jellyfin на запрос: с токеном вошедшего пользователя, а до
        // входа — гостевой, с одним лишь DeviceId браузера.
        $this->app->scoped(Jellyfin::class, function (Application $app): Jellyfin {
            $request = $app->make(Request::class);
            $user = $request->user();
            $user = $user instanceof JellyfinUser ? $user : null;

            return new Jellyfin(
                url: (string) config('jellyfin.url'),
                timeout: (int) config('jellyfin.timeout'),
                identity: ClientIdentity::forRequest($request, $user->deviceId ?? DeviceId::for($request)),
                user: $user,
            );
        });

        // Облегчённой версии страница нужна целиком, с отложенными пропсами.
        $this->app->singleton(ResponseFactory::class, LiteResponseFactory::class);
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        $this->configureDefaults();

        Auth::provider('jellyfin', fn (Application $app): SessionUserProvider => new SessionUserProvider($app->make('session.store')));

        // Панель управления — во встроенном клиенте, и только администраторам.
        Gate::define('admin', fn (JellyfinUser $user): bool => $user->isAdmin);
    }

    /**
     * Configure default behaviors for production-ready applications.
     */
    protected function configureDefaults(): void
    {
        Date::use(CarbonImmutable::class);

        DB::prohibitDestructiveCommands(
            app()->isProduction(),
        );
    }
}
