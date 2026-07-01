# Déploiement Planwise — VM OVH + Docker Compose

Cible MVP : une VM unique (VPC OVH) faisant tourner tous les services via Docker
Compose, derrière Caddy (HTTPS automatique). Seul Caddy est exposé publiquement
(ports 80/443) ; MongoDB et les microservices restent sur le réseau interne.

L'architecture est volontairement prête pour une migration Kubernetes ultérieure
(une image par service, configuration par variables d'environnement, services
stateless hormis MongoDB et le volume documents).

## Contenu du dossier

| Fichier                         | Rôle                                                             |
| ------------------------------- | ---------------------------------------------------------------- |
| `Dockerfile.backend`            | Image générique gateway + microservices (`--build-arg SERVICE=`) |
| `Dockerfile.frontend`           | Image Next.js (sortie standalone)                                |
| `docker-compose.prod.yml`       | Orchestration prod (services internes + Caddy)                   |
| `docker-compose.monitoring.yml` | Stack Grafana/Prometheus (profil `monitoring`, optionnel)        |
| `monitoring/`                   | Config Prometheus, Blackbox, Tempo, OTel Collector, Grafana      |
| `Caddyfile`                     | Reverse proxy + HTTPS (Let's Encrypt)                            |
| `.env.production.example`       | Modèle de configuration (à copier en `.env.production`)          |

## 1. Pré-requis sur la VM

- Docker + plugin Compose (`docker compose version`)
- Ports 80 et 443 ouverts (et **seulement** ceux-là côté public)
- 2 enregistrements DNS A pointant vers la VM : `app.exemple.fr`, `api.exemple.fr`

## 2. Préparer la configuration (une fois)

Sur la VM, dans le répertoire de déploiement (ex. `/opt/planwise`) :

```bash
mkdir -p /opt/planwise/deploy && cd /opt/planwise/deploy
# Récupérer .env.production.example (via le repo ou copie manuelle), puis :
cp .env.production.example .env.production
# Renseigner les secrets (JWT_SECRET, Stripe, Crisp, domaines, REGISTRY…)
openssl rand -hex 48   # pour JWT_SECRET
# Pour VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY, si Node/npm est installé :
npx web-push generate-vapid-keys
# Sinon, sur la VM Docker :
docker run --rm node:22-alpine sh -lc "npm exec --yes web-push generate-vapid-keys"
```

`.env.production` reste **uniquement sur la VM** (jamais commité, jamais transmis
par la CI). La CI ne fait qu'y surcharger `IMAGE_TAG` / `REGISTRY` au déploiement.

`DEPLOY_PATH` (secret GitHub) doit pointer sur `/opt/planwise` (le workflow copie
les fichiers dans `$DEPLOY_PATH/deploy`).

## 3. Secrets & variables GitHub (pour la CD)

Les secrets et variables sont définis dans un **environnement GitHub** nommé
`planwise-cd` (`Settings > Environments > planwise-cd`). Les jobs `build-frontend` et
`deploy` déclarent `environment: planwise-cd` pour y accéder. **Important** : s'ils
étaient créés au niveau dépôt (`Actions > Secrets`) sans environnement, ou dans un
environnement non référencé par le workflow, les valeurs seraient vides au runtime
(erreur typique : `can't connect without a private SSH key or password`).

Secrets de l'environnement `planwise-cd` :

| Secret            | Description                                    |
| ----------------- | ---------------------------------------------- |
| `DEPLOY_SSH_HOST` | IP/host de la VM                               |
| `DEPLOY_SSH_USER` | utilisateur SSH (membre du groupe docker)      |
| `DEPLOY_SSH_KEY`  | clé privée SSH (contenu complet, multi-lignes) |
| `DEPLOY_SSH_PORT` | (optionnel) port SSH, défaut 22                |
| `DEPLOY_PATH`     | chemin de déploiement (ex. `/opt/planwise`)    |

Variables de l'environnement `planwise-cd`, injectées au build du frontend (bundle client) :

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
  -t ghcr.io/mon-org/planwise-api-gateway:manuel .

# Frontend (la version est facultative en build manuel)
docker build -f deploy/Dockerfile.frontend \
  --build-arg NEXT_PUBLIC_API_URL=https://api.exemple.fr/api \
  --build-arg NEXT_PUBLIC_APP_VERSION=v0.1.0 \
  --build-arg NEXT_PUBLIC_GIT_SHA=$(git rev-parse --short HEAD) \
  -t ghcr.io/mon-org/planwise-frontend:manuel .
```

Sur la VM :

```bash
cd /opt/planwise/deploy
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

## 9. Notifications push (VAPID)

Les notifications push nécessitent une paire de clés VAPID, gratuite et générée une
seule fois pour l'environnement de production :

```bash
npx web-push generate-vapid-keys
```

Si `npx` n'est pas installé sur la VM, utiliser Docker sans installer Node sur
l'hôte :

```bash
docker run --rm node:22-alpine sh -lc "npm exec --yes web-push generate-vapid-keys"
```

Renseigner ensuite ces valeurs dans `/opt/planwise/deploy/.env.production` :

```env
VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...
VAPID_SUBJECT=mailto:contact@planwise.fr
```

Puis redémarrer uniquement le service de notifications :

```bash
cd /opt/planwise/deploy
docker compose -f docker-compose.prod.yml --env-file .env.production up -d notifications-service
```

La clé publique est exposée au frontend via `GET /api/notifications/vapid-public-key`.
La clé privée ne doit jamais être commitée. Garder la même paire en production : un
changement de clés peut obliger les utilisateurs à se réabonner aux notifications.

## 10. Monitoring (Grafana + Prometheus)

Stack open source pour surveiller la VM et les conteneurs Docker : CPU/RAM disque,
consommation par service, disponibilité HTTP de l'API et du frontend.

Composants (profil Docker `monitoring`) :

| Service           | Rôle                                      |
| ----------------- | ----------------------------------------- |
| **Prometheus**    | Collecte et stockage des métriques (15 j) |
| **Grafana**       | Dashboards et visualisation               |
| **node-exporter** | Métriques hôte (CPU, RAM, disque)         |
| **cAdvisor**      | Métriques par conteneur Docker            |
| **blackbox**      | Sondes HTTP (`/api/health`, frontend)     |

### Activer sur la VM

1. Renseigner dans `.env.production` :

```env
GRAFANA_ADMIN_USER=admin
GRAFANA_ADMIN_PASSWORD=<mot de passe fort>
GRAFANA_PORT=3030
```

2. Démarrer (la stack applicative doit déjà tourner) :

```bash
cd /opt/planwise/deploy
docker compose -f docker-compose.prod.yml -f docker-compose.monitoring.yml \
  --env-file .env.production --profile monitoring up -d
```

3. Accéder à Grafana via **tunnel SSH** (recommandé — Grafana n'est pas exposé publiquement) :

```bash
ssh -L 3030:127.0.0.1:3030 ubuntu@<IP_VM>
```

Puis ouvrir [http://localhost:3030](http://localhost:3030) et se connecter avec
`GRAFANA_ADMIN_USER` / `GRAFANA_ADMIN_PASSWORD`.

Un dashboard **Planwise — Infra & disponibilité** est provisionné automatiquement.

### Traces APM (OpenTelemetry + Tempo)

Les microservices NestJS envoient des traces OTLP vers `otel-collector` → **Tempo**
quand `OTEL_TRACES_ENABLED=true` (désactivé par défaut).

1. Dans `.env.production` :

```env
OTEL_TRACES_ENABLED=true
OTEL_EXPORTER_OTLP_ENDPOINT=http://otel-collector:4318
```

2. Redémarrer les services backend après activation :

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production up -d
```

3. Dans Grafana : **Explore** → datasource **Tempo** → rechercher par service
   (`planwise-api-gateway`, `planwise-cases-service`, etc.) ou par trace ID.

Dashboard **Planwise — API & traces** : endpoint (`http.target`), méthode, statut HTTP,
débit et latence p95 (métriques dérivées des traces via Tempo → Prometheus).

En local (`npm run backend`) avec le collector Docker :

```bash
npm run monitoring:local
export OTEL_TRACES_ENABLED=true
export OTEL_EXPORTER_OTLP_ENDPOINT=http://127.0.0.1:4318
npm run backend
```

Grafana local : [http://localhost:3030](http://localhost:3030) (`admin` / `admin` par défaut).
Dashboards : **Infra & disponibilité**, **API & traces** (endpoints, statuts HTTP, latence).
Explore → **Tempo** pour l’investigation trace par trace.
Prometheus : [http://localhost:9090](http://localhost:9090).

Vérifier que toute la stack tourne : `docker ps` doit lister `planwise-prometheus-local`,
`planwise-grafana-local`, `planwise-tempo-local` et `planwise-otel-collector-local` en **Up**.
Sinon : `npm run monitoring:local` (le script échoue si un conteneur manque).

**Dépannage Explore** — message « An error occurred within the plugin » : Prometheus n’est
pas joignable par Grafana (`lookup prometheus … no such host`). Relancer la stack monitoring ;
ne pas démarrer Grafana seul sans Prometheus.

### Notes

- Prometheus et Grafana restent sur le réseau interne `planwise` (pas de port public).
- Seul Grafana écoute sur `127.0.0.1:3030` de la VM pour le tunnel SSH.
- Les traces APM (latence par requête HTTP, waterfall inter-services) passent par
  OpenTelemetry + Tempo ; activer avec `OTEL_TRACES_ENABLED=true`.
- Pour exposer Grafana sur un sous-domaine HTTPS, ajouter un bloc Caddy avec
  authentification (ne pas exposer sans protection).

## 11. Sécurité réseau

- N'exposer publiquement que 80/443 (pare-feu OVH + UFW).
- Ne jamais publier le port MongoDB (27017) ni les ports des microservices.
- Garder `.env.production` à accès restreint (`chmod 600`).
