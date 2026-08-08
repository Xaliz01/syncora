# Catalogue des routes (menu app)

Source alignée sur le menu [`AppShell.tsx`](../../apps/frontend/components/layout/AppShell.tsx).  
`permission` vide = accessible dès que l’utilisateur a un abonnement actif (sauf pages compte/org).

| Label                   | href                        | permission                                                 |
| ----------------------- | --------------------------- | ---------------------------------------------------------- |
| Tableau de bord         | `/`                         |                                                            |
| Mon organisation        | `/organization`             |                                                            |
| Mon abonnement          | `/subscription`             |                                                            |
| Mon compte              | `/account`                  |                                                            |
| Ma journée              | `/my-day`                   | `interventions.read`                                       |
| Dossiers                | `/cases`                    | `cases.read`                                               |
| Nouveau dossier         | `/cases/new`                | `cases.create`                                             |
| Planning                | `/cases/calendar`           | `cases.read`                                               |
| Contrats                | `/contracts`                | `contracts.read`                                           |
| Nouveau contrat         | `/contracts/new`            | `contracts.create`                                         |
| Mouvements de stock     | `/stock`                    | `stock.movements.read`                                     |
| Reporting               | `/reporting`                | `exports.reporting`                                        |
| Facturation             | `/billing`                  | `exports.billing`                                          |
| Clients                 | `/customers`                | `customers.read`                                           |
| Nouveau client          | `/customers/new`            | `customers.create`                                         |
| Donneurs d'ordre        | `/order-givers`             | `order_givers.read`                                        |
| Nouveau donneur d'ordre | `/order-givers/new`         | `order_givers.create`                                      |
| Utilisateurs            | `/users`                    | `users.read`                                               |
| Inviter un utilisateur  | `/users/new`                | `users.invite`                                             |
| Équipes                 | `/fleet/teams`              | `teams.read`                                               |
| Techniciens             | `/fleet/technicians`        | `fleet.technicians.read`                                   |
| Véhicules               | `/fleet/vehicles`           | `fleet.vehicles.read`                                      |
| Agences                 | `/fleet/agences`            | `agences.read`                                             |
| Catalogue articles      | `/settings/stock/articles`  | `stock.articles.read`                                      |
| Prestations             | `/settings/prestations`     | `prestations.read`                                         |
| Emplacements de stock   | `/settings/stock/locations` | `stock.locations.read`                                     |
| Modèles de dossier      | `/settings/case-templates`  | `case_templates.read`                                      |
| Profils                 | `/settings/profiles`        | `profiles.read`                                            |
| Notifications           | `/settings/notifications`   | `notifications.manage_preferences`                         |
| Intégrations            | `/settings/integrations`    | `integrations.pennylane.read` ou `integrations.qonto.read` |
| Recherche               | `/search`                   |                                                            |

## Routes détail (dynamiques)

Ne pas inventer d’IDs. Guider vers la **liste** puis « ouvrir la fiche depuis la liste ».

| Contexte              | Pattern             | permission          |
| --------------------- | ------------------- | ------------------- |
| Fiche dossier         | `/cases/:id`        | `cases.read`        |
| Fiche client          | `/customers/:id`    | `customers.read`    |
| Fiche donneur d'ordre | `/order-givers/:id` | `order_givers.read` |
| Fiche contrat         | `/contracts/:id`    | `contracts.read`    |

## Notes assistant

- Sans abonnement actif, le menu est réduit (org / abonnement / compte) — ne pas proposer Dossiers, etc.
- Favoris et historique de navigation sont des raccourcis UI, pas des écrans dédiés.
