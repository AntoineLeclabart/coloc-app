# Mise en ligne sur Cloudflare (gratuit)

L'appli est un seul Worker Cloudflare : il sert le front Angular compilé et l'API sous `/api`, avec une base D1 (SQLite géré par Cloudflare). L'adresse est en HTTPS, du type `https://coloc.ton-sous-domaine.workers.dev`. Il n'y a ni serveur à maintenir ni carte bancaire à donner.

## Ce que donne l'offre gratuite

D'après la documentation Cloudflare (octobre 2026) :

- **Workers** : 100 000 requêtes par jour, 10 ms de calcul par requête. Une coloc en fait quelques centaines.
- **D1** : 5 Go de stockage, 5 millions de lignes lues et 100 000 écrites par jour ([tarifs D1](https://developers.cloudflare.com/d1/platform/pricing/)).
- Si une limite est dépassée, l'appli renvoie des erreurs jusqu'au lendemain. Rien n'est facturé sans passage volontaire à l'offre payante.

## 1. Préparer ton ordinateur (une seule fois)

1. Crée un compte sur https://dash.cloudflare.com/sign-up (gratuit, sans carte).
2. Installe **Node.js LTS** depuis https://nodejs.org, ou dans un terminal Windows : `winget install OpenJS.NodeJS.LTS`.
3. Dans ton clone du dépôt :

   ```sh
   git pull
   cd api
   npm install
   npx wrangler login      # ouvre le navigateur pour autoriser l'accès à ton compte
   ```

## 2. La base de données

Elle est déjà créée (`coloc`) et son identifiant est dans `api/wrangler.jsonc`. À refaire seulement sur un autre compte Cloudflare : `npx wrangler d1 create coloc`, puis reporter le `database_id` affiché dans ce fichier.

## 3. Mettre en ligne

```sh
npm run deploy
```

Ce script compile le front, crée les tables dans D1 (confirme avec `y`) et publie le Worker. La première fois, Cloudflare te demande de choisir ton sous-domaine `workers.dev`. L'adresse de l'appli s'affiche à la fin.

## 4. Choisir le mot de passe (une seule fois)

Tant que ces deux secrets ne sont pas définis, personne ne peut se connecter.

```sh
# Clé qui signe les cookies de connexion : colle une longue suite aléatoire, par exemple
node -e "console.log(crypto.randomBytes(32).toString('hex'))"
npx wrangler secret put APP_SECRET

# Mot de passe de la coloc : la première commande affiche le hash à coller dans la seconde
npm run hash-password
npx wrangler secret put COLOC_MOT_DE_PASSE_HASH
```

Ouvre ensuite l'adresse de l'appli, connecte-toi et va dans **Réglages** pour créer les colocs et les catégories.

## Mettre à jour

```sh
git pull
cd api && npm install && npm run deploy
```

Les nouvelles migrations de base de données s'appliquent pendant le déploiement.

## Sauvegardes

D1 garde un historique qui permet de revenir à un état récent de la base (*Time Travel*, dans le tableau de bord Cloudflare → D1 → coloc). Pour garder une copie chez toi :

```sh
cd api && npx wrangler d1 export coloc --remote --output sauvegarde.sql
```

## Changer le mot de passe

Regénère un hash avec `npm run hash-password`, puis `npx wrangler secret put COLOC_MOT_DE_PASSE_HASH`. Tous les appareils sont déconnectés.

## Utiliser ton propre nom de domaine (facultatif)

Si tu as un domaine géré par Cloudflare : tableau de bord → Workers & Pages → coloc → Settings → Domains & Routes → Add → Custom domain.
