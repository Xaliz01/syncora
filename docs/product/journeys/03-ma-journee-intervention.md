# Parcours — Ma journée & intervention terrain

## Objectif

Voir les interventions du jour, démarrer / clôturer, photos, signature, rapport PDF.

## Prérequis

- Permission `interventions.read` (et droits d’action selon le profil)
- Compte souvent lié à un **technicien**

## Étapes

1. Menu **Suivi** → **Ma journée** (`/my-day`).
2. Ouvrir une intervention planifiée.
3. Démarrer (horodatage / géoloc si activée), ajouter photos, notes.
4. Faire signer le client, terminer l’intervention.
5. Générer / télécharger le **rapport PDF** si proposé.

## Copilote

Les actions vocales de Ma journée passent par **Dicter une instruction** (droit `ai.copilot`), sur toutes les pages. Exemples : démarrer ou terminer une intervention, ajouter un commentaire, ouvrir le dossier, demander la prochaine intervention, rédiger ou mettre à jour le compte-rendu. Rien n'est enregistré avant confirmation. Détail : [24-copilote.md](./24-copilote.md).

## Liens utiles

- Ma journée : `/my-day`
- Planning (vue équipe) : `/cases/calendar`
- Dossier parent : via la fiche intervention / dossier

## Erreurs fréquentes

- Liste vide → pas d’intervention assignée aujourd’hui, mauvais technicien lié au compte, ou **aucun technicien lié** à l’utilisateur.
- Pas de Ma journée dans le menu → permission `interventions.read` absente.
- Pour lier un utilisateur à un technicien avant assignation : voir [08-assigner-intervention.md](./08-assigner-intervention.md).
- Micro absent / non supporté → Chrome / Safari récents ; flag désactivé par défaut.
