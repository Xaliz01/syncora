# Design — Consolidation monolithe modulaire

## Architecture cible

```
┌─────────────────────────────────────────────────────────────┐
│                     planwise-api (:3000)                     │
│                                                              │
│  AuthModule · AccountModule · OrganizationsModule            │
│  CasesModule · InterventionsModule · QuotesModule            │
│  CustomersModule · OrderGiversModule                         │
│  TechniciansModule · TeamsModule · AgencesModule             │
│  FleetModule · StockModule · DocumentsModule                 │
│  BillingModule · ExportsModule · IntegrationsModule          │
│  SubscriptionsModule · PermissionsModule                     │
│  SearchModule · PlatformModule · AssistantModule             │
│  TrialTestDataModule · DataImportModule · AnalyticsModule    │
│                                                              │
│  → MongooseModule.forRoot() × 13 databases (named conns)    │
│  → Contrôleurs HTTP (ex-gateway + ex-microservices fusionnés)│
│  → Services injectés directement (plus de HTTP inter-service)│
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                   planwise-worker (:3020)                     │
│                                                              │
│  ScheduleModule                                              │
│  MaintenanceContractVisitsScheduler (cases DB)               │
│  InvoiceSyncScheduler (integrations DB)                      │
│  TrialTestDataCleanupScheduler (organizations DB)            │
│                                                              │
│  → Mêmes modules métier que l'API (read/write DB)            │
│  → Pas de contrôleurs HTTP publics (sauf /health)            │
│  → CronRunRecorder partagé                                   │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│               planwise-notifications (:3010)                 │
│                                                              │
│  NotificationsModule (CRUD notifications, préférences)       │
│  PushSubscriptionModule                                      │
│  EmailModule (transactional, notification emails)            │
│  InterventionReminderScheduler                               │
│  MaintenanceVisitReminderScheduler                           │
│  NotificationEventListener (EventEmitter)                    │
│                                                              │
│  → notifications DB propre                                   │
│  → Accès lecture aux modules métier (users, cases,           │
│    subscriptions, technicians) via injection directe         │
└─────────────────────────────────────────────────────────────┘
```

## Décisions clés

### D1 — Multi-database Mongoose avec connexions nommées

Chaque module garde sa propre database Mongo. On utilise `MongooseModule.forRoot(uri, { connectionName })` pour enregistrer des connexions nommées, et `MongooseModule.forFeature([...], connectionName)` dans chaque module.

```typescript
// Exemple : CasesModule
MongooseModule.forRoot(
  process.env.CASES_DB_URI ?? 'mongodb://localhost:27017/planwise-cases',
  { connectionName: 'cases' }
),
MongooseModule.forFeature([
  { name: 'Case', schema: CaseSchema },
  { name: 'Intervention', schema: InterventionSchema },
  // ...
], 'cases'),
```

Cela évite toute migration de données et permet de fusionner les databases plus tard si souhaité (renaming des connexions suffirait).

### D2 — Remplacement des appels HTTP par injection directe

Aujourd'hui le gateway fait :

```typescript
// Gateway cases.service.ts
const res = await firstValueFrom(
  this.scopedHttp.request("GET", SERVICE_URLS.cases, "/cases", user),
);
```

Demain, le controller injecte directement le port abstrait :

```typescript
// CasesController
constructor(private readonly casesService: AbstractCasesService) {}

async findAll(user: AuthUser) {
  return this.casesService.findAll({ organizationId: user.organizationId, ... });
}
```

L'`OrganizationScopedHttpClient` et `SERVICE_URLS` disparaissent progressivement. La validation `organizationId` reste en place dans les services via `organizationScopeFilter()`.

### D3 — Notifications : instance séparée justifiée

Les notifications restent un service séparé parce que :

1. **Crons à la minute** (`InterventionReminderScheduler`) — charge indépendante de l'API
2. **Envoi push/email** — I/O lent, ne doit pas impacter la latence API
3. **Scalabilité future** — seul module susceptible de nécessiter un scaling horizontal (envois en masse)

La communication API → Notifications reste par **EventEmitter** in-process quand co-localisé (mode dev), ou par HTTP si déployé séparément.

### D4 — Worker : crons isolés

Les crons lourds (maintenance contracts toutes les heures, trial cleanup quotidien) sont isolés pour :

1. Ne pas bloquer l'API en cas de traitement long
2. Permettre un restart sans downtime API
3. Logs séparés pour le monitoring

Le worker importe les mêmes modules métier que l'API mais n'expose pas de routes HTTP (sauf `/health`).

### D5 — Migrations : consolidation progressive

Les migrations `migrate-mongo` restent par database. Le runner au boot (`runPendingMigrations`) est appelé pour chaque connexion nommée au démarrage de `planwise-api` et `planwise-worker`.

### D6 — `@planwise/shared` : inchangé

Le package partagé ne change pas. Les types, DTOs, et utilitaires restent identiques.

## Mapping services → instances

| Service actuel        | Instance cible             | Connexion Mongo                                                                                       |
| --------------------- | -------------------------- | ----------------------------------------------------------------------------------------------------- |
| api                   | **planwise-api**           | (pas de DB propre)                                                                                    |
| organizations-service | **planwise-api**           | `organizations`                                                                                       |
| users-service         | **planwise-api**           | `users`                                                                                               |
| permissions-service   | **planwise-api**           | `permissions`                                                                                         |
| cases-service         | **planwise-api**           | `cases`                                                                                               |
| fleet-service         | **planwise-api**           | `fleet`                                                                                               |
| technicians-service   | **planwise-api**           | `technicians`                                                                                         |
| stock-service         | **planwise-api**           | `stock`                                                                                               |
| customers-service     | **planwise-api**           | `customers`                                                                                           |
| subscriptions-service | **planwise-api**           | `subscriptions`                                                                                       |
| documents-service     | **planwise-api**           | `documents`                                                                                           |
| exports-service       | **planwise-api**           | (pas de DB, HTTP only)                                                                                |
| integrations-service  | **planwise-api**           | `integrations`                                                                                        |
| billing-service       | **planwise-api**           | `billing`                                                                                             |
| notifications-service | **planwise-notifications** | `notifications`                                                                                       |
| _crons cases_         | **planwise-worker**        | `cases`                                                                                               |
| _crons organizations_ | **planwise-worker**        | `organizations`, `cases`, `stock`, `fleet`, `technicians`, `customers`, `permissions`, `integrations` |
| _crons integrations_  | **planwise-worker**        | `integrations`                                                                                        |

## Dépendances inter-modules actuelles (à convertir en injections)

La matrice ci-dessous montre les appels HTTP actuels entre services (hors gateway) qui deviennent des injections :

| Appelant                            | Appelle (HTTP)                                                         | Motif                                 |
| ----------------------------------- | ---------------------------------------------------------------------- | ------------------------------------- |
| notifications-service               | cases-service                                                          | interventions upcoming, mark-reminded |
| notifications-service               | users-service                                                          | résoudre email user                   |
| notifications-service               | subscriptions-service                                                  | vérifier accès org                    |
| notifications-service               | technicians-service                                                    | résoudre userId depuis assigneeId     |
| organizations-service               | subscriptions-service                                                  | vérifier fin essai                    |
| organizations-service               | cases, stock, fleet, technicians, customers, permissions, integrations | purge test-data                       |
| exports-service                     | cases, users, customers, technicians, integrations                     | agrégation données                    |
| billing-service                     | cases-service                                                          | lier facture au dossier               |
| billing-service                     | notifications-service                                                  | notifier envoi facture                |
| integrations-service                | cases-service                                                          | sync factures                         |
| subscriptions-service               | notifications-service                                                  | notifier                              |
| subscriptions-service               | organizations-service                                                  | lookup org                            |
| gateway (NotificationEventListener) | notifications-service, users-service, subscriptions-service            | créer notif, push, email              |

## Structure du code

Un seul package. Le rôle est choisi par `PLANWISE_PROCESS` (`all` | `api` | `worker` | `notifications`).

```
services/
└── api/                               # @planwise/api
    ├── src/
    │   ├── main.ts                    # Boot: migrations, NestFactory, rôle du processus
    │   ├── process-role.ts
    │   ├── tracer.ts
    │   ├── modules/
    │   │   ├── app.module.ts
    │   │   └── database.module.ts     # MongooseModule.forRoot() × 13 connexions
    │   ├── domain/                    # Un dossier par domaine (ports, services, mappers)
    │   └── persistence/
    ├── migrations/                    # Par database (cases, integrations, billing, …)
    └── package.json
```

## Migration réalisée

Les anciens packages `services/*-service` et `services/api-gateway` ont été fusionnés dans `services/api`. Les trois processus partagent cette image ; il n’y a pas de dossiers `planwise-worker` ni `planwise-notifications`. Les appels HTTP internes sont des injections Nest. Le worker et les notifications sont isolés par `PLANWISE_PROCESS`, pas par un second codebase.

## Impact déploiement

### Avant (14+1 conteneurs)

```yaml
# docker-compose.prod.yml — 16 services
mongodb, api-blue, api-green, frontend-blue, frontend-green,
organizations-service, users-service, permissions-service, cases-service,
fleet-service, technicians-service, stock-service, customers-service,
subscriptions-service, notifications-service, documents-service,
exports-service, integrations-service, billing-service
```

### Après (3+1 conteneurs)

```yaml
# docker-compose.prod.yml — une image planwise-api, trois processus
mongodb, api-blue, api-green, planwise-worker,
planwise-notifications, frontend-blue, frontend-green
```

### CI/CD

- Build : une image Docker (`SERVICE=api`) au lieu de 15
- Deploy : `rolling-edge.sh` blue/green `api` et `frontend` ; worker et notifications en instance unique
- `PLANWISE_PROCESS` distingue les trois processus de la même image
