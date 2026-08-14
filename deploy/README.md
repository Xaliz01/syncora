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
| `static/maintenance.html`       | Page de secours si le frontend upstream est KO (Caddy 5xx)       |
| `rolling-edge.sh`               | Bascule blue/green api-gateway + frontend (quasi zero-downtime)  |
| `prune-planwise-images.sh`      | Après MEP : garde images courante + précédente uniquement        |
| `.env.production.example`       | Modèle de configuration (à copier en `.env.production`)          |

## Migrations Mongo (microservices)

Les microservices appliquent les migrations [migrate-mongo](https://github.com/seppevs/migrate-mongo)
au démarrage via `runPendingMigrations` (`@planwise/shared/nest`) :

- Config partagée : `createMigrateMongoConfig({ defaultUri })` dans `migrate-mongo-config.js`
- Fichiers : `services/<service>/migrations/*.js`
- Changelog Mongo : collection `changelog` dans la DB du service
- Échec d’une migration → le process refuse de démarrer
- En local / ops : `npm run migrate:status|up|down -w @planwise/<service>`

Services déjà équipés : `integrations-service`, `cases-service`.
Les autres services doivent adopter le même schéma pour toute évolution d’index / schéma Mongo.

## 1. Pré-requis sur la VM

- Docker + plugin Compose (`docker compose version`)
- Ports 80 et 443 ouverts (et **seulement** ceux-là côté public)
- 5 enregistrements DNS A pointant vers la VM : `exemple.fr` (landing), `app.exemple.fr`, `api.exemple.fr`, `backoffice.exemple.fr`, `monitoring.exemple.fr` (Grafana)
- Optionnel : `www.exemple.fr` → même IP (redirigé vers l'apex par Caddy)

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
| `NEXT_PUBLIC_MARKETING_HOST`         | `exemple.fr`                 |
| `NEXT_PUBLIC_APP_HOST`               | `app.exemple.fr`             |
| `NEXT_PUBLIC_CRISP_WEBSITE_ID`       | identifiant Crisp            |
| `NEXT_PUBLIC_CRISP_HELPDESK_ENABLED` | `false`                      |
| `NEXT_PUBLIC_GOOGLE_ADS_ID`          | `AW-…` (Google Ads / gtag)   |

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
4. Copie de `docker-compose.prod.yml`, `Caddyfile`, `rolling-edge.sh` et monitoring
   sur la VM (SCP).
5. Sur la VM : `pull` → `up` des microservices / Caddy / monitoring →
   **`rolling-edge.sh`** bascule api-gateway + frontend (blue/green, sans coupure
   visible sur les domaines publics).
6. **Prune images** : `prune-planwise-images.sh` ne conserve que les images
   applicatives (`$REGISTRY/planwise-*`) de la MEP courante et de la précédente
   (fichier `.previous-image-tag` sur la VM, pour un rollback rapide). Les images
   monitoring / Mongo ne sont pas touchées. Remplace le `docker image prune -a`
   manuel périodique.
7. **Tag Git automatique** : si une `version` a été fournie et que le déploiement
   a réussi, le workflow crée et pousse le tag Git correspondant (ex. `v0.1.0`)
   sur le commit déployé. Étape ignorée pour un déploiement sans version (SHA).

### Blue/green (api-gateway + frontend)

Caddy route vers `*-blue` et `*-green` avec health checks (`lb_policy first`) :
seul le slot healthy reçoit le trafic. Le script `rolling-edge.sh` :

1. détecte le slot actif ;
2. démarre l'autre slot avec la nouvelle image ;
3. attend `healthy` ;
4. laisse Caddy basculer (~quelques secondes) ;
5. arrête l'ancien slot.

Les microservices internes sont toujours mis à jour via un `compose up` classique
(courte interruption possible sur les appels en cours uniquement).

**Important** : ne pas lancer un `docker compose up -d` sans liste de services —
cela démarrerait blue **et** green en parallèle.

Dépannage manuel de la bascule edge :

```bash
cd /opt/planwise/deploy
export REGISTRY IMAGE_TAG   # tag déjà pullé
./rolling-edge.sh
```

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
  --build-arg NEXT_PUBLIC_MARKETING_HOST=exemple.fr \
  --build-arg NEXT_PUBLIC_APP_HOST=app.exemple.fr \
  --build-arg NEXT_PUBLIC_APP_VERSION=v0.1.0 \
  --build-arg NEXT_PUBLIC_GIT_SHA=$(git rev-parse --short HEAD) \
  -t ghcr.io/mon-org/planwise-frontend:manuel .
```

Sur la VM :

```bash
cd /opt/planwise/deploy
export REGISTRY IMAGE_TAG   # même tag que le build
docker compose -f docker-compose.prod.yml -f docker-compose.monitoring.yml \
  --env-file .env.production --profile monitoring pull
# Microservices + monitoring (pas un up global)
docker compose -f docker-compose.prod.yml -f docker-compose.monitoring.yml \
  --env-file .env.production --profile monitoring up -d \
  mongodb organizations-service users-service permissions-service \
  cases-service fleet-service technicians-service stock-service \
  subscriptions-service customers-service notifications-service \
  documents-service exports-service integrations-service \
  prometheus tempo otel-collector grafana loki alloy node-exporter cadvisor blackbox-exporter mongodb-exporter
./rolling-edge.sh
# Caddy + purge des anciens conteneurs api-gateway / frontend
docker compose -f docker-compose.prod.yml -f docker-compose.monitoring.yml \
  --env-file .env.production --profile monitoring up -d --remove-orphans caddy
```

## 6. MongoDB

Par défaut, MongoDB tourne dans Compose (volume `mongodb-data`, non exposé).
Les documents applicatifs sont déjà sur S3 ; **la base reste critique** : mettre
en place les backups ci-dessous dès le MVP, puis tester une restauration.

À terme : migration vers un **MongoDB managé** (renseigner alors `MONGO_BASE_URI`,
ou surcharger chaque `MONGODB_URI` dans le compose).

### 6.1 Backups automatisés → Object Storage OVH

Scripts : `deploy/backup/mongo-backup.sh` et `mongo-restore.sh`.

1. **Bucket S3** (idéal : bucket séparé `planwise-backups`, privé, pas de lecture
   publique). Réutiliser les clés S3 déjà utilisées pour les documents, ou un
   utilisateur Object Storage dédié « backup only ».
2. Dans `.env.production` :

```env
S3_ENDPOINT=https://s3.eu-west-par.io.cloud.ovh.net
AWS_REGION=eu-west-par
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
MONGO_BACKUP_S3_BUCKET=planwise-backups
MONGO_BACKUP_S3_PREFIX=mongo/
MONGO_BACKUP_RETENTION_DAYS=14
# Optionnel — chiffrement avant upload (conserver la phrase hors du bucket) :
# MONGO_BACKUP_ENCRYPT_PASSPHRASE=...
```

3. **Test manuel** (sur la VM, depuis `/opt/planwise/deploy`) :

```bash
chmod +x backup/*.sh
./backup/mongo-backup.sh
```

4. **Planification** — choisir une des deux options.

**Option A (recommandée) — cron hôte**

```bash
sudo tee /etc/cron.d/planwise-mongo-backup >/dev/null <<'EOF'
# Tous les jours à 03:15 Europe/Paris (ajuster le fuseau de la VM)
15 3 * * * root DEPLOY_DIR=/opt/planwise/deploy /opt/planwise/deploy/backup/mongo-backup.sh >> /var/log/planwise-mongo-backup.log 2>&1
EOF
sudo chmod 644 /etc/cron.d/planwise-mongo-backup
```

**Option B — profil Compose `backup` (Ofelia)**

```bash
sudo mkdir -p /var/lib/planwise/mongo-backup-work
docker compose -f docker-compose.prod.yml -f docker-compose.backup.yml \
  --env-file .env.production --profile backup up -d
```

### 6.2 Restauration

```bash
# Lister (avec AWS CLI via Docker) :
docker run --rm \
  -e AWS_ACCESS_KEY_ID -e AWS_SECRET_ACCESS_KEY -e AWS_DEFAULT_REGION \
  amazon/aws-cli:2.15.0 \
  s3 ls "s3://${MONGO_BACKUP_S3_BUCKET:-planwise-backups}/mongo/" \
  --endpoint-url "$S3_ENDPOINT"

# Restaurer (ÉCRASE les données Mongo — confirmer avant) :
./backup/mongo-restore.sh s3://planwise-backups/mongo/planwise-mongo-YYYYMMDD….archive.gz
```

Tester une restauration au moins une fois (VM de staging ou Mongo jetable) avant
d’avoir vraiment besoin des backups.

## 7. Stockage des documents

`STORAGE_PROVIDER=local` (défaut) stocke dans le volume `documents-data`.
Avec `STORAGE_PROVIDER=s3` (Object Storage OVH), renseigner `S3_BUCKET`,
`S3_ENDPOINT`, `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`.
Les fichiers documents ne sont plus sur le volume Docker : seuls Mongo + secrets
restent à sauvegarder côté VM.

## 8. Stripe (webhook)

Endpoint public (Caddy → `subscriptions-service`, **pas** le gateway) :

```text
https://api.exemple.fr/webhooks/stripe
```

1. Dashboard Stripe → Developers → Webhooks → Add endpoint.
2. URL : `https://$API_DOMAIN/webhooks/stripe` (ex. `https://api.planwise.fr/webhooks/stripe`).
3. Événements à écouter :
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
4. Copier le **Signing secret** (`whsec_…`) dans `.env.production` → `STRIPE_WEBHOOK_SECRET`.
5. Redémarrer le service abonnements :

```bash
cd /opt/planwise/deploy
docker compose -f docker-compose.prod.yml --env-file .env.production up -d subscriptions-service
```

Après un déploiement qui met à jour `Caddyfile.template`, recharger Caddy
(`./rolling-edge.sh` ou recreate `caddy`) pour que la route `/webhooks/stripe` soit active.

Test rapide depuis la VM (doit répondre 400 sans signature Stripe, pas 404) :

```bash
curl -sS -o /dev/null -w "%{http_code}\n" -X POST "https://$API_DOMAIN/webhooks/stripe"
```

Renseigner aussi les price IDs addons (`STRIPE_ADDON_*`) et le Customer Portal
(`STRIPE_BILLING_PORTAL_CONFIGURATION_ID`) avant d’ouvrir les paiements.

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

## 10. Monitoring (Grafana + Prometheus + Loki)

Stack open source pour surveiller la VM, les conteneurs, les **logs applicatifs**
et les traces : CPU/RAM, disponibilité HTTP, logs Docker, APM.

Composants (profil Docker `monitoring`) :

| Service              | Rôle                                         |
| -------------------- | -------------------------------------------- |
| **Prometheus**       | Collecte et stockage des métriques (15 j)    |
| **Grafana**          | Dashboards et visualisation                  |
| **Loki**             | Stockage des logs applicatifs (14 j)         |
| **Alloy**            | Collecte des logs Docker → Loki              |
| **node-exporter**    | Métriques hôte (CPU, RAM, disque)            |
| **cAdvisor**         | Métriques par conteneur Docker               |
| **blackbox**         | Sondes HTTP (`/api/health`, frontend)        |
| **mongodb-exporter** | Métriques MongoDB (connexions, ops, tailles) |

### Activer sur la VM

1. DNS : enregistrement A `monitoring.exemple.fr` (ou `MONITORING_DOMAIN`) → IP de la VM.

2. Renseigner dans `.env.production` :

```env
MONITORING_DOMAIN=monitoring.exemple.fr
GRAFANA_ADMIN_USER=admin
GRAFANA_ADMIN_PASSWORD=<mot de passe fort>
GRAFANA_ROOT_URL=https://monitoring.exemple.fr
GRAFANA_PORT=3030
```

3. La CD démarre automatiquement l’app **et** le profil monitoring, et **persiste**
   `IMAGE_TAG` / `REGISTRY` dans `.env.production`.

   Pour (re)démarrer **uniquement** le monitoring sans toucher aux images app :

```bash
cd /opt/planwise/deploy
docker compose -f docker-compose.prod.yml -f docker-compose.monitoring.yml \
  --env-file .env.production --profile monitoring up -d \
  prometheus tempo otel-collector grafana loki alloy node-exporter cadvisor blackbox-exporter mongodb-exporter
```

Éviter un `up` global sans le bon `IMAGE_TAG` : Compose recréerait l’app avec le
tag du `.env.production` (souvent `latest` ou une ancienne version).

Prérequis `.env.production` : `MONITORING_DOMAIN`, `GRAFANA_ADMIN_PASSWORD`, `GRAFANA_ROOT_URL`
(sinon le deploy CD échoue au démarrage de Grafana).

4. Accéder à Grafana : [https://monitoring.exemple.fr](https://monitoring.exemple.fr)
   (login `GRAFANA_ADMIN_USER` / `GRAFANA_ADMIN_PASSWORD`).

Secours tunnel SSH si besoin :

```bash
ssh -L 3030:127.0.0.1:3030 ubuntu@<IP_VM>
```

Dashboards provisionnés automatiquement (dossier Grafana **Planwise**) :

- **Planwise — Infra & disponibilité** — VM, sondes HTTP, CPU/RAM conteneurs
- **Planwise — MongoDB** — uptime, connexions, ops/s, tailles des bases
- **Planwise — Logs** — volume + recherche filtrée par service Compose
- **Planwise — API & traces** — (si Tempo / OTEL activés)

### Logs applicatifs (Loki)

Dans Grafana : **Explore** → datasource **Loki**, ou dashboard **Planwise — Logs**.

Exemples LogQL :

```logql
{compose_service="api-gateway-blue"} |= "ERROR"
{compose_service=~"cases-service|customers-service"} |= "organizationId"
{container=~".*(cases-service|api-gateway).*"} |~ "(?i)exception|fatal"
```

Les labels utiles : `compose_service`, `container`, `stream` (stdout/stderr), `job=docker`.
Seuls les conteneurs du réseau Docker **`planwise`** sont collectés (Loki/Alloy exclus).
Les microservices n’ont souvent pas de `container_name` fixe : Alloy les reconnaît via
ce réseau (et le label Compose `compose_service`), pas via le préfixe `planwise-`.

Chaque service Nest émet un access log HTTP (hors `/health`) au format :
`http_access method=GET path=/cases status=200 durationMs=12 organizationId=…`

Exemples :

```logql
{compose_service="cases-service"} |= "http_access"
{compose_service=~".+-service|api-gateway.*"} |= "http_access" |= "status=5"
```

Si Grafana n’affiche que monitoring/Mongo (pas les API) : Alloy filtrait autrefois sur
`planwise-*` uniquement — redéployer la config Alloy puis :

```bash
docker compose -f docker-compose.prod.yml -f docker-compose.monitoring.yml \
  --env-file .env.production --profile monitoring up -d --force-recreate alloy
```

Puis Explore → Loki → `{job="docker"}` : vérifier `compose_service` (`cases-service`,
`api-gateway-blue`, etc.).

### cAdvisor (métriques conteneurs)

Sur Docker 29 avec storage `overlayfs`, cAdvisor peut spammer
`failed to identify the read-write layer ID` / `mount-id: no such file`. Ce n’est **pas**
lié aux logs Loki. La stack désactive les métriques disque overlay (`--disable_metrics=disk…`)
pour garder CPU/RAM/réseau ; le disque hôte reste suivi via node-exporter.

Si Grafana affiche **Datasource loki was not found** : le fichier de provisioning
n’était pas rechargé, ou Loki n’était pas démarré. Corriger ainsi :

```bash
cd /opt/planwise/deploy
docker compose -f docker-compose.prod.yml -f docker-compose.monitoring.yml \
  --env-file .env.production --profile monitoring up -d loki alloy
docker compose -f docker-compose.prod.yml -f docker-compose.monitoring.yml \
  --env-file .env.production --profile monitoring up -d --force-recreate grafana
```

Puis Connections → Data sources : vérifier que **Loki** (`uid: loki`) apparaît.
Explore → Loki → `{job="docker"}`.

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

- Prometheus, Tempo et les exporters restent sur le réseau interne `planwise` (pas de port public).
- Grafana est exposé via Caddy sur `MONITORING_DOMAIN` (HTTPS Let's Encrypt) ; l'auth
  Grafana (mot de passe admin, signup désactivé) est obligatoire.
- Le port `127.0.0.1:3030` reste disponible pour un tunnel SSH de secours.
- Les traces APM (latence par requête HTTP, waterfall inter-services) passent par
  OpenTelemetry + Tempo ; activer avec `OTEL_TRACES_ENABLED=true`.

## 11. Sécurité réseau

- N'exposer publiquement que 80/443 (pare-feu OVH + UFW).
- Ne jamais publier le port MongoDB (27017) ni les ports des microservices.
- Garder `.env.production` à accès restreint (`chmod 600`).
