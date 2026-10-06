#!/bin/sh
# Copie la base SQLite dans ~/sauvegardes-coloc et garde les 30 dernières.
# À lancer depuis la racine du dépôt, par exemple chaque nuit avec cron :
#   0 3 * * * cd ~/coloc-app && sh deploy/sauvegarde.sh
set -e

dossier="$HOME/sauvegardes-coloc"
fichier="coloc-$(date +%Y-%m-%d).db"
mkdir -p "$dossier"

# VACUUM INTO produit une copie cohérente même si l'appli écrit en même temps.
docker compose -f compose.prod.yaml exec -T app \
    php -r '$db = new PDO("sqlite:/app/donnees/coloc.db"); @unlink("/tmp/sauvegarde.db"); $db->exec("VACUUM INTO \"/tmp/sauvegarde.db\"");'
docker compose -f compose.prod.yaml cp app:/tmp/sauvegarde.db "$dossier/$fichier"

ls -1t "$dossier"/coloc-*.db | tail -n +31 | xargs -r rm --
echo "Sauvegarde : $dossier/$fichier"
