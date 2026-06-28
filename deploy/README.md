# Déploiement Syncora — VM OVH + Docker Compose

Cible MVP : une VM unique (VPC OVH) faisant tourner tous les services via Docker
Compose, derrière Caddy (HTTPS automatique). Seul Caddy est exposé publiquement
(ports 80/443) ; MongoDB et les microservices restent sur le réseau interne.

L'architecture est volontairement prête pour une migration Kubernetes ultérieure
(une image par service, configuration par variables d'environnement, services
stateless hormis MongoDB et le volume documents).

## Contenu du dossier

| Fichier                   | Rôle                                                             |
| ------------------------- | ---------------------------------------------------------------- |
| `Dockerfile.backend`      | Image générique gateway + microservices (`--build-arg SERVICE=`) |
| `Dockerfile.frontend`     | Image Next.js (sortie standalone)                                |
| `docker-compose.prod.yml` | Orchestration prod (services internes + Caddy)                   |
| `Caddyfile`               | Reverse proxy + HTTPS (Let's Encrypt)                            |
| `.env.production.example` | Modèle de configuration (à copier en `.env.production`)          |

## 1. Pré-requis sur la VM

- Docker + plugin Compose (`docker compose version`)
- Ports 80 et 443 ouverts (et **seulement** ceux-là côté public)
- 2 enregistrements DNS A pointant vers la VM : `app.exemple.fr`, `api.exemple.fr`

## 2. Préparer la configuration (une fois)

Sur la VM, dans le répertoire de déploiement (ex. `/opt/syncora`) :

```bash
mkdir -p /opt/syncora/deploy && cd /opt/syncora/deploy
# Récupérer .env.production.example (via le repo ou copie manuelle), puis :
cp .env.production.example .env.production
# Renseigner les secrets (JWT_SECRET, Stripe, Crisp, domaines, REGISTRY…)
openssl rand -hex 48   # pour JWT_SECRET
```

`.env.production` reste **uniquement sur la VM** (jamais commité, jamais transmis
par la CI). La CI ne fait qu'y surcharger `IMAGE_TAG` / `REGISTRY` au déploiement.

`DEPLOY_PATH` (secret GitHub) doit pointer sur `/opt/syncora` (le workflow copie
les fichiers dans `$DEPLOY_PATH/deploy`).

## 3. Secrets & variables GitHub (pour la CD)

Secrets (`Settings > Secrets and variables > Actions > Secrets`) :

| Secret            | Description                                |
| ----------------- | ------------------------------------------ |
| `DEPLOY_SSH_HOST` | IP/host de la VM                           |
| `DEPLOY_SSH_USER` | utilisateur SSH (membre du groupe docker)  |
| `DEPLOY_SSH_KEY`  | clé privée SSH                             |
| `DEPLOY_SSH_PORT` | (optionnel) port SSH, défaut 22            |
| `DEPLOY_PATH`     | chemin de déploiement (ex. `/opt/syncora`) |

Variables (`Variables`), injectées au build du frontend (bundle client) :

| Variable                             | Exemple                      |
| ------------------------------------ | ---------------------------- |
| `NEXT_PUBLIC_API_URL`                | `https://api.exemple.fr/api` |
| `NEXT_PUBLIC_CRISP_WEBSITE_ID`       | identifiant Crisp            |
| `NEXT_PUBLIC_CRISP_HELPDESK_ENABLED` | `false`                      |

Le push des images utilise le `GITHUB_TOKEN` intégré (registry GHCR).

## 4. Déclencher un déploiement

Le workflow **CD (déploiement manuel)** se lance à la main, **depuis master uniquement** :

`Actions > CD (déploiement manuel) > Run workflow` (brancher sur `master`).

Renseigner l'input **`version`** avec la version SemVer à déployer (ex. `v0.1.0`).
Laisser vide pour un déploiement non versionné (le SHA court du commit sert alors
de tag d'image et de version applicative).

Étapes automatiques :

1. Garde-fou : refus si la ref n'est pas `master`.
2. Build & push des 13 images backend + frontend sur GHCR. Chaque image reçoit
   trois tags : la version (ou SHA si vide), le SHA court du commit, et `latest`.
3. Le frontend est buildé avec `NEXT_PUBLIC_APP_VERSION` (= version) et
   `NEXT_PUBLIC_GIT_SHA` (= SHA court) → affichés dans l'app (page « Mon compte »).
   Les images backend reçoivent `APP_VERSION` / `GIT_SHA` au build : exposés par
   `GET /api/health` et les en-têtes `X-App-Version` / `X-Git-Sha` sur chaque réponse.
4. Copie de `docker-compose.prod.yml` et `Caddyfile` sur la VM (SCP).
5. `docker compose pull` + `up -d` sur la VM avec le tag fraîchement construit.
6. **Tag Git automatique** : si une `version` a été fournie et que le déploiement
   a réussi, le workflow crée et pousse le tag Git correspondant (ex. `v0.1.0`)
   sur le commit déployé. Étape ignorée pour un déploiement sans version (SHA).

### Convention de versioning (SemVer + tag Git)

On suit [SemVer](https://semver.org/lang/fr/) : `MAJEUR.MINEUR.CORRECTIF`
(ex. `0.1.0`). **Pas besoin de créer le tag à la main** : il suffit de lancer la CD
avec `version = v0.1.0`. Le workflow tague automatiquement le commit déployé une fois
le déploiement réussi. Le même libellé sert de tag d'image Docker, de tag Git, et de
version affichée dans l'application.

La création du tag est **idempotente** : si le tag existe déjà sur `origin` (release
rejouée), l'étape n'échoue pas et ne le récrée pas.

## 5. Déploiement manuel (sans CI, dépannage)

Depuis la racine du repo, sur une machine avec Docker :

```bash
# Exemple pour un service backend
docker build -f deploy/Dockerfile.backend --build-arg SERVICE=api-gateway \
  --build-arg APP_VERSION=v0.1.0 --build-arg GIT_SHA=$(git rev-parse --short HEAD) \
  -t ghcr.io/mon-org/syncora-api-gateway:manuel .

# Frontend (la version est facultative en build manuel)
docker build -f deploy/Dockerfile.frontend \
  --build-arg NEXT_PUBLIC_API_URL=https://api.exemple.fr/api \
  --build-arg NEXT_PUBLIC_APP_VERSION=v0.1.0 \
  --build-arg NEXT_PUBLIC_GIT_SHA=$(git rev-parse --short HEAD) \
  -t ghcr.io/mon-org/syncora-frontend:manuel .
```

Sur la VM :

```bash
cd /opt/syncora/deploy
docker compose -f docker-compose.prod.yml --env-file .env.production pull
docker compose -f docker-compose.prod.yml --env-file .env.production up -d
```

## 6. MongoDB

Par défaut, MongoDB tourne dans Compose (volume `mongodb-data`, non exposé).
Pour un MVP c'est acceptable, mais prévoir **dès que possible** :

- sauvegardes quotidiennes chiffrées (`mongodump`) vers un Object Storage OVH ;
- tests de restauration réguliers ;
- migration vers un **MongoDB managé** (renseigner alors `MONGO_BASE_URI`, ou
  surcharger chaque `MONGODB_URI` directement dans le compose si l'URI managée
  comporte des identifiants/paramètres de requête).

## 7. Stockage des documents

`STORAGE_PROVIDER=local` (défaut) stocke dans le volume `documents-data`.
Penser à le sauvegarder, ou basculer sur `STORAGE_PROVIDER=s3` (Object Storage
OVH compatible S3 : renseigner `S3_BUCKET`, `S3_ENDPOINT`, `AWS_REGION`,
`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`).

## 8. Stripe (webhook)

Configurer dans Stripe l'URL de webhook vers l'API publique
(`https://api.exemple.fr/api/...`) et renseigner `STRIPE_WEBHOOK_SECRET`.

## 9. Sécurité réseau

- N'exposer publiquement que 80/443 (pare-feu OVH + UFW).
- Ne jamais publier le port MongoDB (27017) ni les ports des microservices.
- Garder `.env.production` à accès restreint (`chmod 600`).
