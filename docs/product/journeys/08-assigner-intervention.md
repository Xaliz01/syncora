# Parcours — Assigner une intervention (technicien / utilisateur)

## Objectif

Comprendre comment une personne (utilisateur) se retrouve sur une intervention : via une fiche **technicien**, pas en choisissant l’utilisateur directement.

## Règle métier

- L’affectation d’une intervention se fait sur un **technicien** (ou une **équipe**), jamais directement sur un compte utilisateur.
- Pour qu’un **utilisateur** voie l’intervention dans **Ma journée** et reçoive les notifications (rappel, push, e-mail), un technicien doit être **lié** à son compte.
- On peut quand même assigner un technicien **sans** compte utilisateur lié (affectation terrain / planning) ; seules les notifications et Ma journée exigent le lien.

## Prérequis

- Permissions flotte / dossier selon l’action : `fleet.technicians.read` (ou create), `users.read` pour lier un compte, `cases.read` / édition d’intervention sur le dossier ou le planning.

## Étapes — lier utilisateur ↔ technicien

1. Créer un technicien : **Flotte** → **Techniciens** (`/fleet/technicians`), ou depuis la fiche utilisateur (**Créer un technicien associé**).
2. Sur la fiche technicien : **lier un compte existant**, ou inviter un nouvel utilisateur ; depuis la fiche utilisateur : vérifier qu’un technicien est bien associé.
3. (Optionnel) Ajouter le technicien à une **équipe** (`/fleet/teams`) si l’assignation se fait par équipe.

## Étapes — assigner l’intervention

1. Ouvrir le **dossier** (`/cases` → fiche) ou le **Planning** (`/cases/calendar`).
2. Créer ou éditer l’intervention.
3. Choisir **soit une équipe, soit un technicien** (pas les deux en même temps).
4. Enregistrer. L’utilisateur lié au technicien verra l’intervention dans **Ma journée** (`/my-day`) le jour prévu.

## Liens utiles

- Techniciens : `/fleet/technicians`
- Équipes : `/fleet/teams`
- Utilisateurs : `/users`
- Planning : `/cases/calendar`
- Ma journée : `/my-day`
- Dossiers : `/cases`

## Erreurs fréquentes

- « Je ne trouve pas l’utilisateur dans la liste d’assignation » → c’est normal : la liste propose des **techniciens**. Créer ou lier un technicien d’abord.
- Ma journée vide pour un collègue → technicien non lié à son compte, ou intervention non assignée / mauvais jour.
- Pas de notifications → technicien sans compte utilisateur lié.
