#!/bin/sh
set -e

# Le code est monté depuis l'hôte : on installe les dépendances et on
# applique les migrations à chaque démarrage (rapide si rien n'a changé).
composer install --no-interaction --prefer-dist
php bin/console doctrine:migrations:migrate --no-interaction --allow-no-migration

exec "$@"
