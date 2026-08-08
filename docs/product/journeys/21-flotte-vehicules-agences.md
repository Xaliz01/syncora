# Parcours — Flotte : véhicules et agences

## Objectif

Compléter la flotte au-delà des techniciens / équipes (déjà couverts par l’assignation d’intervention).

## Menu

Section **Gestion** (libellé UI) — les URLs restent sous `/fleet/…` :

| Ressource   | Route                | Permission typique       |
| ----------- | -------------------- | ------------------------ |
| Équipes     | `/fleet/teams`       | `teams.read`             |
| Techniciens | `/fleet/technicians` | `fleet.technicians.read` |
| Véhicules   | `/fleet/vehicles`    | `fleet.vehicles.read`    |
| Agences     | `/fleet/agences`     | `agences.read`           |

## Véhicules

1. Gestion → **Véhicules**.
2. Immatriculation, type, kilométrage, statut ; assignation possible selon l’écran.
3. Un véhicule peut être lié à un **emplacement de stock**.

## Agences

1. Gestion → **Agences** : bases / sites de l’organisation.
2. Utiles pour le reporting kilométrique (agence → chantier) et l’organisation terrain.

## Équipes / techniciens

Voir `08-assigner-intervention.md` : assignation d’intervention sur **équipe ou technicien** (pas les deux), lien utilisateur ↔ technicien pour Ma journée.

## Liens utiles

- Véhicules : `/fleet/vehicles`
- Agences : `/fleet/agences`
- Équipes : `/fleet/teams`
- Techniciens : `/fleet/technicians`
- Emplacements de stock : `/settings/stock/locations`
