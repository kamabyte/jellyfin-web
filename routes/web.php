<?php

use App\Http\Controllers\FavoriteController;
use App\Http\Controllers\HomeController;
use App\Http\Controllers\ItemController;
use App\Http\Controllers\LibraryController;
use App\Http\Controllers\LoginController;
use App\Http\Controllers\PlaybackController;
use App\Http\Controllers\PlayedController;
use App\Http\Controllers\QuickConnectController;
use App\Http\Controllers\QuickConnectLoginController;
use App\Http\Controllers\SearchController;
use App\Http\Controllers\WatchController;
use App\Jellyfin\BuiltInClient;
use Illuminate\Support\Facades\Route;

Route::middleware('guest')->group(function () {
    Route::get('login', [LoginController::class, 'create'])->name('login');
    Route::post('login', [LoginController::class, 'store'])->middleware('throttle:10,1')->name('login.store');

    // Вход кодом: код показываем здесь, подтверждают его на устройстве, где
    // уже вошли (в этом клиенте — /quick-connect, или в любом другом).
    Route::post('login/quick-connect', [QuickConnectLoginController::class, 'store'])->name('login.quick-connect.store');
    Route::post('login/quick-connect/check', [QuickConnectLoginController::class, 'check'])->name('login.quick-connect.check');
    Route::delete('login/quick-connect', [QuickConnectLoginController::class, 'destroy'])->name('login.quick-connect.destroy');
});

Route::middleware('auth')->group(function () {
    Route::get('/', HomeController::class)->name('home');
    Route::get('search', SearchController::class)->name('search');

    Route::get('libraries/{library}', [LibraryController::class, 'show'])->name('libraries.show');
    Route::get('items/{item}', [ItemController::class, 'show'])->name('items.show');

    Route::post('items/{item}/played', [PlayedController::class, 'store'])->name('items.played.store');
    Route::delete('items/{item}/played', [PlayedController::class, 'destroy'])->name('items.played.destroy');
    Route::post('items/{item}/favorite', [FavoriteController::class, 'store'])->name('items.favorite.store');
    Route::delete('items/{item}/favorite', [FavoriteController::class, 'destroy'])->name('items.favorite.destroy');

    Route::get('watch/{item}', [WatchController::class, 'show'])->name('watch');
    // Плеер: как играть (JSON) и отчёты о просмотре.
    Route::post('watch/{item}/playback', [PlaybackController::class, 'store'])->name('playback.store');
    Route::post('playback/{event}', [PlaybackController::class, 'report'])->name('playback.report');

    // Впустить другое устройство по коду Quick Connect.
    Route::get('quick-connect', [QuickConnectController::class, 'show'])->name('quick-connect');
    Route::post('quick-connect', [QuickConnectController::class, 'store'])->name('quick-connect.store');

    Route::post('logout', [LoginController::class, 'destroy'])->name('logout');

    // Всё, чего в этом клиенте нет, — во встроенном клиенте Jellyfin.
    Route::get('dashboard', fn () => redirect()->away(BuiltInClient::dashboard()))->middleware('can:admin')->name('built-in.dashboard');
    Route::redirect('admin', 'dashboard');
    Route::get('settings', fn () => redirect()->away(BuiltInClient::preferences()))->name('built-in.preferences');
});
