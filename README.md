# Coloc

Partage des dépenses de la coloc, comme Tricount, avec deux différences :

- les **semaines d'absence** réduisent la part des dépenses variables (courses…) ;
- les **dépenses fixes** (loyer, internet…) ne bougent pas avec les absences.

Le bilan se fait **chaque mois**. Les détails du calcul sont dans [CONCEPTION.md](CONCEPTION.md).

## Lancer le projet

```sh
docker compose up
```

Puis ouvrir http://localhost:4200. Au premier lancement, aller dans **Réglages** pour ajouter les colocs et les catégories (par exemple Loyer en fixe, Courses en variable).

Les données sont dans `api/var/data_dev.db` (SQLite).

## Sans Docker

```sh
cd api && composer install && php bin/console doctrine:migrations:migrate -n && php -S localhost:8000 -t public
cd front && npm install && npx ng serve   # http://localhost:4200
```

## Tests

```sh
cd api && php bin/phpunit
cd front && npx ng test --watch=false
```

## API

| Méthode | Route | Rôle |
|---|---|---|
| GET/POST | `/api/membres` | colocs |
| GET/POST/DELETE | `/api/absences` | absences (dates incluses) |
| GET/POST/PUT/DELETE | `/api/categories` | catégories `fixe` ou `variable`, poids par coloc |
| GET `?mois=AAAA-MM` / POST / DELETE | `/api/depenses` | dépenses (montants en centimes) |
| POST/DELETE | `/api/remboursements` | virements faits pour solder un mois |
| GET | `/api/bilan/AAAA-MM` | parts, soldes et virements à faire |
