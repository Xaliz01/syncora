# Syncora

Syncora est un **CRM SaaS orienté opérations terrain**. Il permet de :

- **Gérer un portefeuille client** (clients, sites, contacts, historique)
- **Planifier des interventions** (création, planification, calendrier)
- **Suivre le cycle de vie d’une intervention** (planifiée → en cours → réalisée → facturée, etc.)
- **Gérer les stocks** (articles, entrepôts, mouvements)
- **Gérer un parc de camions** (flotte, disponibilité, affectations)
- **Gérer les intervenants** (techniciens, équipes) et les **assigner** aux interventions

## Architecture & stack

- **Architecture**
  - Microservices + **hexagonale**
  - **API REST**
  - **API Gateway** frontale pour exposer les routes sur le web
  - Package `@syncora/shared` pour partager les **types** et contrats (front/back et inter-microservices)

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
syncora/
  apps/
    frontend/              # Frontend React/Tailwind/TanStack Query/Playwright
  services/
    api-gateway/           # API Gateway Nest.js (auth, orchestration)
    organizations-service/ # Microservice organisations (MongoDB)
    users-service/         # Microservice utilisateurs (MongoDB, bcrypt, validation credentials)
    permissions-service/   # Microservice permissions (profils, affectations, invitations)
  packages/
    shared/                # Types & contrats partagés (@syncora/shared)
  docker-compose.yml       # MongoDB pour le dev local
  .github/
    workflows/
      ci.yml               # Pipeline CI GitHub Actions
  syncora.product.config.yml   # Produit + auth/permissions
  syncora.tech.config.yml
  syncora.ui.config.yml
```

## Auth & permissions

- **Inscription** : création d’une **organisation** puis d’un **utilisateur admin** lié. (API : `POST /api/auth/register`.)
- **Connexion** : email + mot de passe → JWT avec `sub`, `organizationId`, `role`, `email`. (API : `POST /api/auth/login`, `GET /api/auth/me`.)
- **Rôles** : `admin` (créateur de l’org, pourra gérer les utilisateurs et droits), `member` (pour les futurs utilisateurs créés par l’admin).
- **Permissions** : système granulaire piloté par le `permissions-service` (profils de droits, exceptions par utilisateur, permissions effectives).
- **Administration organisation** :
  - Invitation d’un utilisateur dans l’organisation
  - Création de profils personnalisés de permissions
  - Affectation d’un profil à un utilisateur + surcharges fines (ajouts/retraits de permissions)
  - API admin exposée via l’API Gateway (`/api/admin/...`, admin uniquement)

## Installation

Depuis la racine du projet :

```bash
cd /Users/benoistbabin/Development/syncora
npm install
```

## Démarrage en local

### Backend (une seule commande)

À la racine du projet, une commande lance **MongoDB** (Docker) puis les **trois services** (organizations, users, api-gateway) en mode dev :

```bash
npm run backend
```

- Démarre le conteneur **MongoDB** (`docker compose up -d`) sur le port **27017**
- Attend que MongoDB soit prêt, puis lance en parallèle :
  - **organizations-service** (port 3001)
  - **users-service** (port 3002)
  - **permissions-service** (port 3003)
  - **api-gateway** (port 3000)

Les services se connectent à `localhost:27017` avec leurs bases respectives (`syncora-organizations`, `syncora-users`, `syncora-permissions`). Aucune variable d’environnement requise pour le dev local.

Pour arrêter uniquement MongoDB :

```bash
npm run backend:down
```

Pour lancer uniquement les trois services Node (si MongoDB tourne déjà) :

```bash
npm run backend:run
```

### Frontend

```bash
cd apps/frontend
npm run dev
```

Par défaut, l’application sera disponible sur `http://localhost:5173`.

### Démarrer les services backend individuellement

Si besoin (par ex. après `npm run backend:down` pour ne garder que MongoDB) :

- **organizations-service** (3001) : `npm run start:dev -w @syncora/organizations-service`
- **users-service** (3002) : `npm run start:dev -w @syncora/users-service`
- **permissions-service** (3003) : `npm run start:dev -w @syncora/permissions-service`
- **api-gateway** (3000) : `npm run start:dev -w @syncora/api-gateway`

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

- `MONGODB_URI` (organizations-service et users-service)
- `MONGODB_URI` (permissions-service)
- `ORGANIZATIONS_SERVICE_URL`, `USERS_SERVICE_URL`, `PERMISSIONS_SERVICE_URL` (api-gateway, défaut localhost:3001 / 3002 / 3003)
- `JWT_SECRET` (api-gateway)
- `CORS_ORIGIN` (api-gateway, défaut http://localhost:5173)

## Scripts principaux

Depuis la **racine** du monorepo (`syncora/`) :

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

- Détecte les **briques modifiées** (frontend, API Gateway, etc.)
- Exécute pour chaque brique concernée :
  - Lint
  - Tests
  - Build
- Contient un squelette (désactivé par défaut) pour :
  - Build & push des **images Docker** vers Amazon ECR
  - Déploiement sur **AWS ECS**

## Prochaines étapes possibles

- Définir les **microservices métier** (clients, interventions, stocks, flotte, intervenants)
- Enrichir `@syncora/shared` avec les **DTOs, schémas et contrats d’API**
- Ajouter la configuration Docker/ECR/ECS concrète (référentiels, services ECS, secrets)

