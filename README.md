# Coloc

Partage des dépenses de la coloc, comme Tricount, avec deux différences :

- les **semaines d'absence** réduisent la part des dépenses variables (courses…) ;
- les **dépenses fixes** (loyer, internet…) ne bougent pas avec les absences.

Le bilan se fait **chaque mois**. Les détails du calcul sont dans [CONCEPTION.md](CONCEPTION.md).

L'appli tourne gratuitement sur Cloudflare : l'API est un Worker en TypeScript ([Hono](https://hono.dev)) dans `api/`, les données sont dans une base D1 (SQLite), et le front Angular dans `front/` est servi par le même Worker.

## Lancer le projet

Avec Node.js 22 ou plus récent, dans deux terminaux :

```sh
cd api && npm install && npm run dev     # API sur http://localhost:8000
cd front && npm install && npm start     # http://localhost:4200
```

Ou avec Docker : `docker compose up`, puis http://localhost:4200.

Le mot de passe par défaut est `coloc`. Au premier lancement, aller dans **Réglages** pour ajouter les colocs et les catégories (par exemple Loyer en fixe, Courses en variable).

En local, les données sont dans `api/.wrangler/` (base D1 simulée).

## Mise en ligne

Voir [DEPLOIEMENT.md](DEPLOIEMENT.md) : compte Cloudflare gratuit, sans carte bancaire ni serveur à gérer.

## Mot de passe

Toute la coloc partage un seul mot de passe, et chaque appareil reste connecté un an. Pour obtenir le hash d'un nouveau mot de passe :

```sh
cd api && npm run hash-password
```

En local, le mettre dans `api/.dev.vars` (`COLOC_MOT_DE_PASSE_HASH=...`). En ligne, c'est un secret Cloudflare (voir DEPLOIEMENT.md). Changer le mot de passe déconnecte tous les appareils.

## Tests

```sh
cd api && npm test          # calcul et API, dans le moteur de Cloudflare
cd front && npx ng test --watch=false
```

## API

| Méthode | Route | Rôle |
|---|---|---|
| POST | `/api/login` | connexion (`{"username": "coloc", "password": "..."}`) |
| POST | `/api/logout` | déconnexion |
| GET | `/api/session` | 200 si connecté, 401 sinon |
| GET/POST/DELETE | `/api/membres` | colocs |
| GET/POST/DELETE | `/api/absences` | absences (dates incluses) |
| GET/POST/PUT/DELETE | `/api/categories` | catégories `fixe` ou `variable`, poids par coloc |
| GET `?mois=AAAA-MM` / POST / PUT / DELETE | `/api/depenses` | dépenses (montants en centimes) |
| POST/DELETE | `/api/remboursements` | virements faits pour solder un mois |
| GET | `/api/bilan/AAAA-MM` | parts, soldes et virements à faire |
