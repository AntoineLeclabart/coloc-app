# Image de production : FrankenPHP (Caddy + PHP) sert le front Angular compilé,
# l'API Symfony sous /api, et gère le certificat HTTPS tout seul.
# Construite depuis la racine du dépôt : docker compose -f compose.prod.yaml build

FROM node:24-alpine AS front
WORKDIR /front
COPY front/package.json front/package-lock.json ./
RUN npm ci
COPY front/ ./
RUN npx ng build

FROM composer:2 AS vendor
WORKDIR /app
COPY api/composer.json api/composer.lock api/symfony.lock ./
RUN composer install --no-dev --no-scripts --no-autoloader --prefer-dist --no-interaction --ignore-platform-reqs

FROM dunglas/frankenphp:1-php8.4-alpine
RUN install-php-extensions opcache
COPY --from=composer:2 /usr/bin/composer /usr/local/bin/composer
COPY deploy/php.ini $PHP_INI_DIR/conf.d/zz-coloc.ini

WORKDIR /app
ENV APP_ENV=prod APP_DEBUG=0 \
    DATABASE_URL="sqlite:////app/donnees/coloc.db"
COPY --from=vendor /app/vendor ./vendor
COPY api/ ./
RUN composer dump-autoload --classmap-authoritative --no-dev \
    && composer dump-env prod \
    && php bin/console cache:warmup \
    && mkdir -p donnees
COPY --from=front /front/dist/front/browser /srv/front
COPY deploy/Caddyfile /etc/frankenphp/Caddyfile
COPY deploy/entrypoint.sh /usr/local/bin/coloc-entrypoint
RUN sed -i 's/\r$//' /usr/local/bin/coloc-entrypoint && chmod +x /usr/local/bin/coloc-entrypoint

ENTRYPOINT ["coloc-entrypoint"]
CMD ["frankenphp", "run", "--config", "/etc/frankenphp/Caddyfile"]
