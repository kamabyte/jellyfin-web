<?php

namespace App\Jellyfin;

use RuntimeException;

/**
 * Сервер Jellyfin не ответил или ответил ошибкой 5xx. Страница ошибки —
 * в bootstrap/app.php.
 */
class JellyfinUnavailable extends RuntimeException {}
