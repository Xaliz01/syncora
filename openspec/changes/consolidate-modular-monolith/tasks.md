# Tasks — Consolidation monolithe modulaire

## Phase 0 — Préparation (`planwise-api` scaffold)

### T0.1 — Créer le package `planwise-api`

Créer `services/planwise-api/` avec :

- `package.json` (dépendances = union de gateway + tous microservices)
- `tsconfig.json` (hérite de `tsconfig.base.json`)
- `src/main.ts` — boot NestJS avec multi-DB, migrations, Swagger
- `src/tracer.ts` — copie du tracer gateway
- `src/modules/app.module.ts` — module racine (vide initialement, importe `DatabaseModule`)
- `src/modules/database.module.ts` — `MongooseModule.forRoot()` × 13 connexions nommées

**Critères de validation** : le processus démarre, se connecte aux 13 databases, et expose `/health`.

### T0.2 — DatabaseModule : connexions nommées

Créer un `DatabaseModule` dynamique qui enregistre toutes les connexions Mongoose :

```typescript
const DATABASES = {
  organizations: "mongodb://localhost:27017/planwise-organizations",
  users: "mongodb://localhost:27017/planwise-users",
  permissions: "mongodb://localhost:27017/planwise-permissions",
  cases: "mongodb://localhost:27017/planwise-cases",
  fleet: "mongodb://localhost:27017/planwise-fleet",
  technicians: "mongodb://localhost:27017/planwise-technicians",
  stock: "mongodb://localhost:27017/planwise-stock",
  customers: "mongodb://localhost:27017/planwise-customers",
  subscriptions: "mongodb://localhost:27017/planwise-subscriptions",
  notifications: "mongodb://localhost:27017/planwise-notifications",
  documents: "mongodb://localhost:27017/planwise-documents",
  integrations: "mongodb://localhost:27017/planwise-integrations",
  billing: "mongodb://localhost:27017/planwise-billing",
};
```

Chaque URI surchargeable par variable d'env (`CASES_DB_URI`, `USERS_DB_URI`, etc.). Ajouter `@planwise/shared` un helper `DATABASE_CONNECTIONS` pour standardiser les noms.

### T0.3 — Adapter les schémas pour connexions nommées

Chaque `MongooseModule.forFeature([...])` dans les ex-microservices doit recevoir le `connectionName`. Créer un helper :

```typescript
export function forFeatureOnConnection(connectionName: string, schemas: ModelDefinition[]) {
  return MongooseModule.forFeature(schemas, connectionName);
}
```

Chaque `@InjectModel('Case')` devient `@InjectModel('Case', 'cases')`.

---

## Phase 1 — Migration des services simples (pas de dépendances entrantes)

Ordre : les services les plus petits et sans dépendances croisées d'abord.

### T1.1 — Migrer `fleet-service` (695 lignes)

1. Copier `fleet-service/src/domain/` et `fleet-service/src/persistence/` dans `planwise-api/src/domain/fleet/` et `planwise-api/src/persistence/fleet/`
2. Créer `planwise-api/src/modules/fleet.module.ts` avec `forFeature` sur connexion `fleet`
3. Le controller fleet dans `planwise-api` injecte directement `AbstractFleetService` (au lieu de HTTP)
4. Fusionner `gateway/domain/fleet.service.ts` (proxy HTTP) avec les controllers directs
5. Supprimer `fleet-service/`
6. Adapter les tests unitaires fleet (plus besoin de mock HTTP)

### T1.2 — Migrer `documents-service` (956 lignes)

Même pattern que T1.1. Module simple sans dépendances croisées.

### T1.3 — Migrer `permissions-service` (1698 lignes)

Même pattern. Attention : utilisé par `organizations-service` (test-data cleanup) — cette dépendance sera résolue quand organizations sera migré.

### T1.4 — Migrer `billing-service` (1747 lignes)

Dépend de `cases-service` et `notifications-service` via HTTP. Migrer le module, garder temporairement l'appel HTTP vers notifications (pas encore migré).

### T1.5 — Migrer `technicians-service` (2079 lignes)

Module autonome. Fusionner avec le gateway `technicians.service.ts` + `teams.service.ts` + `agences.service.ts`.

### T1.6 — Migrer `organizations-service` (2521 lignes)

Contient `TrialTestDataCleanupScheduler` → le scheduler sera extrait en Phase 3 (worker). Pour l'instant, il reste dans le module API.

### T1.7 — Migrer `customers-service` (3211 lignes)

Module autonome (customers + order-givers).

### T1.8 — Migrer `subscriptions-service` (3308 lignes)

Dépend de `notifications-service` et `organizations-service` par HTTP. Après migration de organizations, l'injection directe est possible. Notifications reste en HTTP temporairement.

---

## Phase 2 — Migration des services complexes

### T2.1 — Migrer `stock-service` (4160 lignes)

Module autonome. Articles, mouvements, emplacements, prestations.

### T2.2 — Migrer `integrations-service` (4940 lignes)

Dépend de `cases-service` via HTTP. Les deux seront dans `planwise-api` → injection directe. Migrations existantes à conserver.

### T2.3 — Migrer `exports-service` (4696 lignes, pas de DB)

Agrégateur qui appelle cases, users, customers, technicians, integrations. Tous étant dans `planwise-api`, les appels HTTP deviennent des injections directes.

### T2.4 — Migrer `users-service` (6120 lignes)

Module complexe (users, sessions, préférences, memberships, prospect outreach, impersonation audit). Fusionner avec le gateway `account.service.ts`, `auth.service.ts`, `admin.service.ts`.

### T2.5 — Migrer `cases-service` (8086 lignes)

Le plus gros module. Cases, interventions, quotes, comments, history, templates, dashboard, maintenance contracts. Fusionner avec les controllers gateway correspondants.

### T2.6 — Fusionner les controllers gateway

Après migration de tous les services, les controllers du gateway (`presentation/http/`) deviennent les controllers de `planwise-api`. Les services gateway (ex `cases.service.ts` qui proxiait via HTTP) sont supprimés, remplacés par l'injection directe des ports abstraits des ex-microservices.

---

## Phase 3 — Extraction du Worker

### T3.1 — Créer `planwise-worker`

Créer `services/planwise-worker/` :

- `main.ts` : boot NestJS avec `ScheduleModule`, connexions DB nécessaires, `/health` uniquement
- `app.module.ts` : importe `DatabaseModule` + les modules métier nécessaires aux crons

### T3.2 — Extraire les schedulers

Déplacer dans `planwise-worker` :

- `MaintenanceContractVisitsScheduler` (besoin : `cases` DB + `MaintenanceContractsService`)
- `InvoiceSyncScheduler` (besoin : `integrations` DB — actuellement désactivé/noop)
- `TrialTestDataCleanupScheduler` (besoin : `organizations` DB + accès en écriture à cases, stock, fleet, technicians, customers, permissions, integrations via leurs services)

### T3.3 — Supprimer `ScheduleModule` de `planwise-api`

L'API ne lance plus de crons. Le worker est le seul à utiliser `@nestjs/schedule`.

---

## Phase 4 — Consolidation Notifications

### T4.1 — Créer `planwise-notifications`

Créer `services/planwise-notifications/` à partir de l'ancien `notifications-service` :

- Garde sa propre DB `notifications`
- Importe les modules métier nécessaires (users, cases, subscriptions, technicians) pour résoudre en injection directe au lieu de HTTP

### T4.2 — Migrer `NotificationEventListener`

Le listener (actuellement dans le gateway) doit fonctionner dans `planwise-api`. Il utilise `EventEmitter` (in-process). Après migration, il appelle les services notifications directement au lieu de HTTP.

Option architecturale :

- **Couplage direct** : `planwise-api` importe le module notifications et le listener reste in-process (simple, 1 seul process en dev)
- **Découplage** : `planwise-api` émet un event (Redis pub/sub ou BullMQ) et `planwise-notifications` le consomme (plus complexe, justifié seulement à l'échelle)

**Recommandation** : commencer par le couplage direct (un seul process contient tout). Extraire `planwise-notifications` en service séparé quand/si le besoin de scaling se confirme.

### T4.3 — Convertir les appels HTTP du notifications en injections

Les schedulers de rappels (intervention, maintenance visit) appellent aujourd'hui cases, users, subscriptions, technicians par HTTP. Après consolidation, ces services sont disponibles par injection directe.

---

## Phase 5 — Nettoyage et CI/CD

### T5.1 — Supprimer les anciens services

Supprimer les 14 dossiers `services/*-service/` (sauf si conservés temporairement pour référence).

### T5.2 — Supprimer `OrganizationScopedHttpClient`

Plus nécessaire : tous les appels sont des injections directes.

### T5.3 — Supprimer `SERVICE_URLS`

Tous les fichiers `service-urls.config.ts` sont supprimés.

### T5.4 — Adapter `Dockerfile.backend`

Le Dockerfile prend en arg `SERVICE=planwise-api|planwise-worker|planwise-notifications`.

### T5.5 — Adapter `docker-compose.prod.yml`

Remplacer les 14 services par 3. Conserver le blue/green pour `planwise-api` et `frontend`. Worker et notifications en single-instance.

### T5.6 — Adapter GitHub Actions CI/CD

- `ci.yml` : adapter les paths triggers, le typecheck, et les tests
- `cd.yml` : matrice de build réduite à 3 services + frontend. Adapter le script deploy SSH.

### T5.7 — Adapter le script `backend:run` local

Le script `npm run backend` doit démarrer 3 processus (api + worker + notifications) au lieu de 15. Temps de démarrage cible : < 5s.

### T5.8 — Mettre à jour les fichiers de configuration projet

- `planwise.tech.config.yml` : architecture `modular_monolith`, 3 instances
- `.cursor/rules/planwise.mdc` : adapter les références microservices
- `deploy/README.md` : adapter les instructions de déploiement

---

## Phase 6 — Validation

### T6.1 — Tests unitaires

Tous les tests unitaires existants doivent passer. Les tests qui mockaient des appels HTTP inter-services doivent être adaptés pour mocker les ports abstraits injectés.

### T6.2 — Tests E2E

Les tests Playwright doivent passer sans modification (l'API externe ne change pas).

### T6.3 — Test de déploiement staging

Déployer les 3 nouvelles images sur un environnement de staging (ou la VM OVH en maintenance) et valider :

- Connexion aux 13 databases
- Migrations au boot
- Crons fonctionnels
- Notifications (in-app, push, email)
- Blue/green deploy

---

## Ordre d'exécution recommandé

```
T0.1 → T0.2 → T0.3 (scaffold, parallélisable)
  ↓
T1.1 → T1.2 → T1.3 → T1.5 → T1.7 (services simples, 1 par 1)
  ↓
T1.4 → T1.6 → T1.8 (services avec dépendances internes)
  ↓
T2.1 → T2.2 → T2.3 → T2.4 → T2.5 → T2.6 (services complexes)
  ↓
T3.1 → T3.2 → T3.3 (extraction worker)
  ↓
T4.1 → T4.2 → T4.3 (consolidation notifications)
  ↓
T5.1 → T5.2 → T5.3 → T5.4 → T5.5 → T5.6 → T5.7 → T5.8 (nettoyage)
  ↓
T6.1 → T6.2 → T6.3 (validation)
```

Chaque tâche T1.x/T2.x est un commit/PR indépendant : l'application reste fonctionnelle à chaque étape (mode hybride : certains services déjà consolidés, d'autres encore en microservice).
