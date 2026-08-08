# Parcours — Créer un client

## Objectif

Enregistrer un client (particulier ou entreprise) pour l’utiliser dans les dossiers.

## Prérequis

- Permission `customers.create`
- Abonnement actif

## Étapes

1. Menu **Gestion** → **Clients** (`/customers`), ou aller directement à `/customers/new`.
2. Choisir le type (particulier / entreprise) et renseigner nom, contacts, adresse.
3. Enregistrer : la fiche client est créée (`/customers/:id`).
4. Optionnel : ajouter des **sites** d’intervention depuis la fiche.

## Liens utiles

- Liste : `/customers`
- Création : `/customers/new`

## Erreurs fréquentes

- « Je ne vois pas Clients » → droit `customers.read` / `customers.create` manquant, ou abonnement inactif.
- Facturer un autre tiers que le client chantier → utiliser un **donneur d'ordre**.
