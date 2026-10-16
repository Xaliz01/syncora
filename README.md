# Planwise

Planwise est un **CRM SaaS orienté opérations terrain**. Il permet de :

- **Gérer un portefeuille client** (clients, sites, contacts, historique)
- **Planifier des interventions** (création, planification, calendrier)
- **Suivre le cycle de vie d’une intervention** (planifiée → en cours → réalisée → facturée, etc.)
- **Gérer les stocks** (articles, entrepôts, mouvements)
- **Gérer un parc de camions** (flotte, disponibilité, affectations)
- **Gérer les intervenants** (techniciens, équipes) et les **assigner** aux interventions

## Architecture & stack

- **Architecture**
  - Monolithe modulaire **hexagonal** (`services/api`), trois processus : API, worker, notifications
  - **API REST**
  - Package `@planwise/shared` pour partager les **types** et contrats front/back

- **Frontend**
  - React + TypeScript
  - TanStack Query
  - Tailwind CSS
  - Playwright (tests e2e)
  - ESLint + Prettier

- **Backend**
  - Node.js + Nest.js (TypeScript)
  - MongoDB + Mongoose
  - Jest (tests unitaires / intégration)
  - ESLint + Prettier

- **DevOps**
  - AWS ECS
  - CI GitHub Actions (lint, build, tests, build & push Docker, déploiement ECS)

## Structure du repo

```text
planwise/
  apps/
    frontend/              # Frontend React/Tailwind/TanStack Query/Playwright
  services/
    api/           # API Nest (domaines, crons worker et notifications)
  packages/
    shared/                # Types & contrats partagés (@planwise/shared)
  docker-compose.yml       # MongoDB pour le dev local
  .github/
    workflows/
      ci.yml               # Pipeline CI GitHub Actions
  planwise.vision.md            # Vision, cible artisans/TPE, roadmap
  planwise.product.config.yml   # Produit + auth/permissions
  planwise.tech.config.yml
  planwise.ui.config.yml
```

## Auth & permissions

- **Inscription** : création d’une **organisation** puis d’un **utilisateur admin** lié. (API : `POST /api/auth/register`.)
- **Connexion** : email + mot de passe → JWT avec `sub`, `organizationId`, `role`, `email`. (API : `POST /api/auth/login`, `GET /api/auth/me`.)
- **Rôles** : `admin` (créateur de l’org, pourra gérer les utilisateurs et droits), `member` (pour les futurs utilisateurs créés par l’admin).
- **Permissions** : profils de droits, exceptions par utilisateur, permissions effectives.
- **Administration organisation** :
  - Invitation d’un utilisateur dans l’organisation
  - Création de profils personnalisés de permissions
  - Affectation d’un profil à un utilisateur + surcharges fines (ajouts/retraits de permissions)
  - API admin (`/api/admin/...`, admin uniquement)

## Installation

Depuis la racine du projet :

```bash
cd /Users/benoistbabin/Development/planwise
npm install
```

## Démarrage en local

### Backend (une seule commande)

À la racine du projet, une commande lance **MongoDB** (Docker) puis l’**API** en mode dev :

```bash
npm run backend
```

- Démarre le conteneur **MongoDB** (`docker compose up -d`) sur le port **27017**
- Attend que MongoDB soit prêt, puis lance l’API sur le port **3000** (`PLANWISE_PROCESS=all` : HTTP et crons)

Les domaines utilisent `localhost:27017` et une base par connexion (`planwise-organizations`, `planwise-users`, `planwise-cases`, …). Aucune variable d’environnement requise pour le dev local.

En production, la même image tourne en trois processus : `api` (3000), `notifications` (3010), `worker` (3020). En local : `npm run backend:worker` et `npm run backend:notifications` si on veut les séparer (ne pas les lancer en plus du mode `all`, les crons seraient en double).

Pour arrêter uniquement MongoDB :

```bash
npm run backend:down
```

Pour lancer uniquement l’API (si MongoDB tourne déjà) :

```bash
npm run backend:run
```

### Frontend

```bash
cd apps/frontend
npm run dev
```

Par défaut, l’application sera disponible sur `http://localhost:5173`.

### Démarrer l’API seule

Si MongoDB tourne déjà :

- **API** (3000) : `npm run start:dev -w @planwise/api`

Endpoints utiles :

- `GET /api/health`
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/accept-invitation`
- `GET /api/auth/me`
- `POST /api/admin/users/invite`
- `GET /api/admin/users`
- `PUT /api/admin/users/:userId/permissions`
- `POST /api/admin/permission-profiles`
- `GET /api/admin/permission-profiles`
- `PATCH /api/admin/permission-profiles/:profileId`
- `DELETE /api/admin/permission-profiles/:profileId`
- `GET /api/admin/invitations`

Variables d’environnement optionnelles :

- `MONGO_BASE_URI` (préfixe commun, ex. `mongodb://localhost:27017`) ou une variable par base (`CASES_DB_URI`, …)
- `PLANWISE_PROCESS` (`all` par défaut, `api`, `worker`, `notifications`)
- `JWT_SECRET`
- `CORS_ORIGIN` (défaut http://localhost:5173)

## Scripts principaux

Depuis la **racine** du monorepo (`planwise/`) :

- **Lint** (toutes les workspaces qui l’implémentent) :

  ```bash
  npm run lint
  ```

- **Tests** (unitaires/intégration/e2e selon les workspaces) :

  ```bash
  npm test
  ```

- **Build** (toutes les workspaces) :

  ```bash
  npm run build
  ```

- **Tests e2e frontend uniquement** :

  ```bash
  npm run e2e
  ```

## CI / CD (aperçu)

Le workflow GitHub Actions (`.github/workflows/ci.yml`) :

- Détecte les **briques modifiées** (frontend, API, etc.)
- Exécute pour chaque brique concernée :
  - Lint
  - Tests
  - Build
- Contient un squelette (désactivé par défaut) pour :
  - Build & push des **images Docker** vers Amazon ECR
  - Déploiement sur **AWS ECS**

## Prochaines étapes possibles

- Enrichir `@planwise/shared` avec les **DTOs, schémas et contrats d’API**
- Ajouter la configuration Docker/ECR/ECS concrète (référentiels, services ECS, secrets)
