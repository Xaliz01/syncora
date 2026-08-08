# Parcours — Donneurs d'ordre

## Objectif

Enregistrer le **tiers facturé** lorsqu’il diffère du client chantier (particulier ou entreprise).

## Prérequis

- `order_givers.read` / `order_givers.create`
- Abonnement actif

## Étapes

1. Menu **Gestion → Donneurs d'ordre** (`/order-givers`), ou **Nouveau** (`/order-givers/new`).
2. Renseigner identité et contacts comme pour un client.
3. Sur un **dossier**, sélectionner le donneur d’ordre si la facturation ne va pas au client chantier.
4. La sync facture vers Pennylane / Qonto / démo s’appuie sur ce mapping.

## Ne pas confondre

- **Client** = bénéficiaire / site d’intervention.
- **Donneur d'ordre** = qui paie / est facturé quand ce n’est pas le client.

## Liens utiles

- Donneurs d'ordre : `/order-givers`
- Nouveau : `/order-givers/new`
- Clients : `/customers`
- Dossiers : `/cases`
- Facturation : `/billing`
