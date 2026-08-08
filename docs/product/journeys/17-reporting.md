# Parcours — Reporting

## Objectif

Consulter des rapports en tableau puis les exporter (Excel, CSV, PDF).

## Accès

1. Menu **Suivi → Reporting** (`/reporting`) — entrée menu avec `exports.reporting`.
2. Chaque **carte** exige sa propre permission d’export ; le hub peut être visible alors que certaines cartes manquent.

## Rapports disponibles (via le hub)

| Rapport                 | Chemin (détail)                   | Permission typique      |
| ----------------------- | --------------------------------- | ----------------------- |
| Liste des dossiers      | `/reporting/cases_list`           | `exports.cases`         |
| Liste des interventions | `/reporting/interventions_list`   | `exports.interventions` |
| Activité techniciens    | `/reporting/technicians_activity` | `exports.reporting`     |
| Rapport kilométrique    | `/reporting/mileage_report`       | `exports.reporting`     |
| Liste des clients       | `/reporting/customers_list`       | `exports.customers`     |
| Liste des utilisateurs  | `/reporting/users_list`           | `exports.users`         |
| Liste des factures      | `/reporting/invoices_list`        | `exports.billing`       |

## Pour l’assistant

- Proposer d’abord `/reporting`, puis « choisir la carte du rapport ».
- Les URLs `/reporting/:type` ne sont **pas** dans le catalogue de suggestions whitelist — ne pas les inventer comme liens cliquables assistant ; guider via le hub.
- Période souvent plafonnée (~2 ans) selon le rapport.
- Rapport km : km estimés (agence → chantier) et km effectifs GPS, carburant / CO₂ par équipe ou technicien.

## Liens utiles

- Reporting : `/reporting`
