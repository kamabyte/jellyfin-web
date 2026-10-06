<?php

namespace App\Jellyfin;

use RuntimeException;

/**
 * Сервер не нашёл, как отдать файл этому браузеру (или запрещено политикой
 * пользователя). Сообщение — код ошибки Jellyfin.
 */
class PlaybackUnavailable extends RuntimeException {}
