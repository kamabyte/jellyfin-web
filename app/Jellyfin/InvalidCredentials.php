<?php

namespace App\Jellyfin;

use RuntimeException;

/** Jellyfin не принял имя и пароль или код Quick Connect. */
class InvalidCredentials extends RuntimeException {}
