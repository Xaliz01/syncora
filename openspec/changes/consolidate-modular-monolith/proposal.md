# Consolidation microservices → monolithe modulaire (3 instances)

## Résumé

Remplacer les 14 microservices NestJS + 1 API gateway par **un package** `services/api` (`@planwise/api`) et **3 processus** de la même image :

1. **`planwise-api`** (`PLANWISE_PROCESS=api`, slots `api-blue` / `api-green`) — HTTP, tous les modules métier
2. **`planwise-worker`** — Jobs cron lourds (visites de maintenance, sync factures, purge données d’essai)
3. **`planwise-notifications`** — Rappels, push, e-mail

Le tout **en conservant** la base MongoDB existante (13 databases) et l'architecture hexagonale (ports, services, mappers) au sein de chaque module.

## Contexte

Planwise est un CRM terrain pour artisans / TPE développé par un **seul développeur**. L'architecture actuelle en 14 microservices impose :

- **Overhead opérationnel** : 15 processus à démarrer en dev (script avec `sleep` cumulé de 20s+), 15 images Docker à build/push/déployer
- **Communication fragile** : appels HTTP synchrones inter-services (pas de saga, pas d'event bus), N+1 calls, pas de transactions cross-service
- **Duplication systématique** : `main.ts`, `app.module.ts`, `service-urls.config.ts`, `cron-run.schema.ts` dupliqués dans chaque service
- **Déploiement monolithique de fait** : tout tourne sur une seule VM OVH, une seule instance Mongo 7 (13 databases distinctes), pas de scaling indépendant

Le split en 3 instances conserve une séparation logique (API vs background vs notifications) tout en éliminant 90% de l'overhead.

## Motivations

- **DX** : 1 process en dev au lieu de 15, debug avec un seul stacktrace, rechargement rapide
- **Fiabilité** : appels de méthode NestJS in-process au lieu de HTTP inter-services (plus de timeouts, retries, erreurs réseau fictives)
- **Simplicité CI/CD** : 3 images Docker au lieu de 16, deploy en 30s au lieu de 5min
- **Performance** : élimination de la sérialisation/désérialisation JSON inter-services
- **Maintenabilité** : un seul repo de migrations, un seul arbre de modules NestJS

## Périmètre

### Inclus

- Fusion des 14 microservices en 3 binaires NestJS
- Migration des appels HTTP inter-services vers des injections de dépendances NestJS directes
- Mise à jour du Dockerfile, docker-compose.prod.yml, CI/CD
- Connexion multi-database Mongoose (les 13 databases restent distinctes)
- Conservation des tests unitaires existants (adaptation des mocks HTTP → mocks de service)

### Exclus (hors scope)

- Migration MongoDB → PostgreSQL (changement indépendant, ultérieur)
- Refactoring de la logique métier interne aux modules
- Ajout de nouvelles fonctionnalités
- Changement du modèle de données ou des collections
- Migration des données en production
