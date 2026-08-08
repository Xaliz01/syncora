# Parcours — Créer un dossier

## Objectif

Ouvrir un dossier (affaire) avec éventuellement un modèle d’étapes/tâches.

## Prérequis

- Permission `cases.create` (et `cases.read` pour la liste)
- Idéalement un client déjà créé

## Étapes

1. Menu **Suivi** → **Dossiers** (`/cases`), puis **Nouveau**, ou `/cases/new`.
2. Titre, client (et donneur d’ordre si besoin), priorité / échéance.
3. Choisir un **modèle de dossier** si proposé (copie les étapes et tâches).
4. Enregistrer → fiche dossier (`/cases/:id`) : étapes, tâches, interventions, documents, devis.

## Liens utiles

- Liste : `/cases`
- Création : `/cases/new`
- Modèles : `/settings/case-templates` (`case_templates.read`)

## Suite typique

- Planifier une **intervention** depuis le dossier
- Suivre les tâches dans la timeline du dossier
- Créer un **devis** puis passer en facturation
