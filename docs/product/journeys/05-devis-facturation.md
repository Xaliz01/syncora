# Parcours — Devis & facturation

## Objectif

Établir un devis sur un dossier, puis suivre / créer la facture via l’outil connecté (ou mode démo).

## Prérequis

- Accès au dossier (`cases.read` / édition selon action)
- Pour le suivi factures : `exports.billing`
- Intégration : droits `integrations.*.read` / configure selon le provider

## Étapes

1. Ouvrir le **dossier** concerné (`/cases` → fiche).
2. Section devis : créer / éditer les lignes (prestations, TVA).
3. Télécharger le PDF devis si besoin.
4. Quand le travail est facturable : statut de facturation du dossier, puis **Facturation** (`/billing`) pour le suivi.
5. **Intégrations** (`/settings/integrations`) : connecter Pennylane, Qonto, ou activer la facturation démo en essai.

## Liens utiles

- Facturation : `/billing`
- Intégrations : `/settings/integrations`
- Prestations (catalogue) : `/settings/prestations`

## Erreurs fréquentes

- « Mon outil n’est pas dans la liste » → contacter le support (chat) pour une intégration.
- Une seule intégration de facturation active à la fois.
