# Mise en ligne sur Oracle Cloud (gratuit)

L'appli tourne dans un seul conteneur [FrankenPHP](https://frankenphp.dev) : il sert le front Angular compilé, l'API Symfony sous `/api`, et obtient tout seul un certificat HTTPS (Let's Encrypt). La base SQLite est dans un volume Docker.

Fichiers concernés : `compose.prod.yaml`, `deploy/` (Dockerfile, Caddyfile, exemple de configuration, script de sauvegarde).

## Ce que donne l'offre gratuite (vérifié en octobre 2026)

D'après la [page officielle des ressources Always Free](https://docs.oracle.com/en-us/iaas/Content/FreeTier/resourceref.htm) :

- **VM Arm (Ampere A1)** : 2 OCPU et 12 Go de RAM au total. C'était 4 OCPU et 24 Go jusqu'en juin 2026. Largement assez ici.
- **VM AMD micro** : 1/8 d'OCPU et 1 Go de RAM. Trop juste pour compiler l'image, à éviter.
- 200 Go de disque, 10 To de trafic sortant par mois.
- Tout doit être créé dans la **région d'origine** (choisie à l'inscription, définitive).

Deux pièges à connaître :

1. **Récupération des VM inactives.** Oracle peut récupérer une VM Always Free si, sur 7 jours, le CPU (95e percentile), le réseau et la mémoire restent tous sous 20 %. Une appli de coloc sera presque toujours dans ce cas. La parade habituelle est de passer le compte en **Pay As You Go** : la règle ne vise que les comptes Always Free, et les ressources Always Free restent gratuites. Il faut alors une carte bancaire active ; mets une alerte de budget à 1 € pour être prévenu si une ressource payante est créée par erreur.
2. **« Out of host capacity »** à la création de la VM Arm : il n'y a temporairement plus de place dans la région. Réessaie plus tard ou dans un autre domaine de disponibilité. Le passage en Pay As You Go aide aussi.

## 1. Créer le compte et la VM

1. Inscription sur https://www.oracle.com/cloud/free/. Une carte bancaire est demandée pour vérifier l'identité. Choisis une région proche (**France Central (Paris)** ou **France South (Marseille)**) : on ne peut plus la changer ensuite.
2. (Conseillé) Dans *Billing → Upgrade and Manage Payment*, passe en **Pay As You Go**, puis crée une alerte dans *Billing → Budgets*.
3. *Compute → Instances → Create instance* :
   - Image : **Canonical Ubuntu 24.04** (la version aarch64 est proposée automatiquement avec la forme Arm).
   - Forme : **VM.Standard.A1.Flex**, 2 OCPU, 12 Go (le badge « Always Free eligible » doit apparaître).
   - Réseau : laisse le VCN créé par défaut, avec une **adresse IPv4 publique**.
   - Clé SSH : téléverse ta clé publique (`~/.ssh/id_ed25519.pub`) ou télécharge celle générée.
   - Disque de démarrage : 50 Go par défaut, c'est bien.
4. Ouvre les ports web : sur la page de l'instance, clique sur le sous-réseau, puis sa *Security List*, puis *Add Ingress Rules* :
   - source `0.0.0.0/0`, TCP, port de destination `80`
   - source `0.0.0.0/0`, TCP, port de destination `443`
   - source `0.0.0.0/0`, UDP, port de destination `443` (HTTP/3, facultatif)
5. Note l'**IP publique** de l'instance.

## 2. Un nom de domaine gratuit

Le HTTPS demande un nom de domaine. Le plus simple : https://www.duckdns.org, connexion avec un compte GitHub ou Google, crée par exemple `coloc-antoine` et mets l'IP publique de la VM. L'adresse sera `coloc-antoine.duckdns.org`.

## 3. Préparer la VM

```sh
ssh ubuntu@IP_PUBLIQUE

# Pare-feu d'Ubuntu chez Oracle : il bloque tout sauf SSH par défaut.
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 80 -j ACCEPT
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 443 -j ACCEPT
sudo iptables -I INPUT 6 -p udp --dport 443 -j ACCEPT
sudo netfilter-persistent save

# Docker
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker ubuntu
exit   # puis se reconnecter pour que le groupe docker soit pris en compte
```

## 4. Récupérer le code

Le dépôt est privé : le plus simple est une clé de déploiement en lecture seule.

```sh
ssh-keygen -t ed25519 -f ~/.ssh/coloc_deploy -N ""
cat ~/.ssh/coloc_deploy.pub
```

Colle cette clé dans GitHub : dépôt *coloc-app → Settings → Deploy keys → Add deploy key* (sans cocher l'écriture). Puis :

```sh
GIT_SSH_COMMAND="ssh -i ~/.ssh/coloc_deploy" git clone git@github.com:AntoineLeclabart/coloc-app.git
cd coloc-app
git config core.sshCommand "ssh -i ~/.ssh/coloc_deploy"
```

## 5. Configurer et lancer

```sh
cp deploy/coloc.env.exemple deploy/coloc.env
openssl rand -hex 32          # à copier dans APP_SECRET
nano deploy/coloc.env         # renseigner SERVER_NAME et APP_SECRET

# Choisir le mot de passe de la coloc et copier le hash dans COLOC_MOT_DE_PASSE_HASH
docker compose -f compose.prod.yaml run --rm app php bin/console security:hash-password
nano deploy/coloc.env

docker compose -f compose.prod.yaml up -d --build
docker compose -f compose.prod.yaml logs -f   # Ctrl+C pour quitter
```

Garde les apostrophes autour des valeurs dans `coloc.env` (le hash contient des `$`). Le premier build prend quelques minutes. Ensuite, ouvre `https://coloc-antoine.duckdns.org`, connecte-toi et va dans **Réglages** pour créer les colocs et les catégories.

Pour reprendre les données saisies en local plutôt que repartir de zéro :

```sh
scp api/var/data_dev.db ubuntu@IP_PUBLIQUE:coloc.db        # depuis ton ordinateur
docker compose -f compose.prod.yaml cp ~/coloc.db app:/app/donnees/coloc.db   # sur la VM
docker compose -f compose.prod.yaml restart
```

## Mettre à jour

```sh
cd ~/coloc-app
git pull
docker compose -f compose.prod.yaml up -d --build
```

Les migrations de base de données s'appliquent au démarrage du conteneur.

## Sauvegardes

`deploy/sauvegarde.sh` copie la base dans `~/sauvegardes-coloc` et garde les 30 dernières copies. Pour le lancer chaque nuit (`crontab -e`) :

```
0 3 * * * cd ~/coloc-app && sh deploy/sauvegarde.sh
```

Ces copies restent sur la VM : récupère-en une de temps en temps sur ton ordinateur (`scp ubuntu@IP_PUBLIQUE:sauvegardes-coloc/*.db .`), au cas où la VM serait perdue.

## Changer le mot de passe

Regénérer un hash (commande de l'étape 5), le mettre dans `deploy/coloc.env`, puis `docker compose -f compose.prod.yaml up -d`. Tous les appareils sont déconnectés.
