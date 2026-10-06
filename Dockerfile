# Кинотека: веб-клиент Jellyfin — Laravel (PHP-FPM) + nginx в одном контейнере
# (serversideup/php, S6 внутри). Образ ghcr.io/kamabyte/jellyfin-web собирает
# GitHub Actions (.github/workflows/image.yml), запускает Dokploy по
# deploy/dokploy/compose.yml.
#
# Видео и картинки браузер берёт прямо у Jellyfin (JELLYFIN_PUBLIC_URL), через
# PHP идут только страницы и короткие JSON-запросы плеера. Своих данных почти
# нет: SQLite в /data держит сессии и кеш.

# --- Сборка: PHP нужен и фронтенду ------------------------------------------
# @laravel/vite-plugin-wayfinder во время vite build зовёт
# `php artisan wayfinder:generate`, поэтому сборка — в PHP-образе с node.
FROM serversideup/php:8.5-cli-trixie AS build
USER root
COPY --from=node:22-trixie-slim /usr/local/bin/node /usr/local/bin/node
COPY --from=node:22-trixie-slim /usr/local/lib/node_modules /usr/local/lib/node_modules
RUN ln -s ../lib/node_modules/npm/bin/npm-cli.js /usr/local/bin/npm \
 && install-php-extensions intl
WORKDIR /var/www/html
COPY composer.json composer.lock ./
RUN composer install --no-dev --no-interaction --no-progress --no-scripts --no-autoloader --prefer-dist
COPY package.json package-lock.json .npmrc ./
RUN npm ci --no-audit --no-fund --loglevel=error
COPY . .
RUN composer dump-autoload --no-dev --optimize --classmap-authoritative \
 && cp .env.example .env && php artisan key:generate --force --quiet \
 && php artisan package:discover --ansi \
 && npm run build \
 && rm -rf node_modules .env public/hot

# --- Приложение -------------------------------------------------------------
FROM serversideup/php:8.5-fpm-nginx-trixie
USER root
RUN install-php-extensions intl
COPY --chown=www-data:www-data docker/nginx/jellyfin-web.conf /etc/nginx/server-opts.d/jellyfin-web.conf

USER www-data
WORKDIR /var/www/html
COPY --chown=www-data:www-data --from=build /var/www/html ./

# Значения по умолчанию; всё, что про окружение, — в deploy/dokploy/compose.yml.
ENV PHP_OPCACHE_ENABLE=1 \
    PHP_MEMORY_LIMIT=256M \
    PHP_FPM_PM_MAX_CHILDREN=8 \
    HEALTHCHECK_PATH=/up \
    LOG_CHANNEL=stderr
