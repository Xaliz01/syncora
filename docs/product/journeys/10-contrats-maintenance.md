# Parcours — Contrats de maintenance

## Objectif

Suivre un engagement récurrent (visite périodique) et générer ou programmer les dossiers / interventions à venir.

## Prérequis

- `contracts.read` (liste) ; `contracts.create` / `contracts.update` pour créer ou modifier
- Idéalement un **client** et un **modèle de dossier** déjà prêts

## Étapes — créer un contrat

1. Menu **Suivi → Contrats** (`/contracts`), puis **Nouveau** (`/contracts/new`).
2. Renseigner le **client**, le **site** si besoin, le **modèle de dossier**, le titre.
3. Choisir la **récurrence** (en mois) et les dates (début, fin optionnelle, prochaine visite).
4. Choisir le **mode de planification** :
   - **À programmer avec le client** : rappel avant échéance ; vous créez le créneau avec le client (contrat en attente de programmation).
   - **Auto-planifier à l’échéance** : à l’échéance, Planwise crée automatiquement un **dossier** et une **intervention**.
5. Choisir le **rappel** avant échéance : 7, 14 ou 30 jours.
6. Enregistrer. Activer le contrat (statut **actif**) pour qu’il produise des visites.

## Suivi

- Liste `/contracts` : filtre « à programmer » (`?filter=to_schedule`) pour les contrats en mode client en attente.
- Tableau de bord (`/`) : bloc **Visites à programmer** (si droits dossiers + contrats).
- Fiche contrat `/contracts/:id` : programmer une visite, historique des visites générées.

## Liens utiles

- Contrats : `/contracts`
- Nouveau contrat : `/contracts/new`
- Modèles de dossier : `/settings/case-templates`
- Clients : `/customers`

## Erreurs fréquentes

- Rien ne se génère → contrat encore en **brouillon**, **suspendu** ou **terminé** ; ou mode « avec le client » (pas d’auto-création).
- Pas de menu Contrats → permission `contracts.read` manquante ou abonnement inactif.
