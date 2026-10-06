#!/bin/sh
set -e

# Crée ou met à jour la base SQLite (dans le volume « donnees ») avant de démarrer.
php bin/console doctrine:migrations:migrate --no-interaction --allow-no-migration

exec "$@"
