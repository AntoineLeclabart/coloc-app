FROM php:8.4-cli-alpine

# pdo_sqlite est inclus dans l'image officielle.
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /app
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint
# sed : au cas où le fichier aurait été extrait avec des fins de ligne Windows.
RUN sed -i 's/\r$//' /usr/local/bin/docker-entrypoint && chmod +x /usr/local/bin/docker-entrypoint

EXPOSE 8000
ENTRYPOINT ["docker-entrypoint"]
CMD ["php", "-S", "0.0.0.0:8000", "-t", "public"]
