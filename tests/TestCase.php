<?php

namespace Tests;

use Illuminate\Foundation\Testing\TestCase as BaseTestCase;
use Illuminate\Support\Facades\Http;

abstract class TestCase extends BaseTestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        // Клиент целиком на HTTP: любой незаглушенный запрос к Jellyfin —
        // ошибка теста, а не поход в сеть.
        Http::preventStrayRequests();
        $this->withoutVite();
    }
}
