## Why

Sur une intervention, choisir un article dans une liste HTML devient pénible dès que le catalogue est long : l’utilisateur ne peut pas filtrer par nom ou référence. Côté facturation, « Créer une facture » agrège déjà toutes les consommations du dossier, sans permettre de facturer **une** intervention ou un **sous-ensemble** — alors que le statut de facturation existe déjà sur l’intervention et n’est pas alimenté.

## What Changes

- Remplacer le `<select>` d’ajout d’articles sur une intervention par le `SearchableSelect` existant (recherche par nom / référence).
- Permettre de créer une facture **depuis une intervention** (action sur la carte) ou **depuis plusieurs interventions du même dossier** (sélection + action groupée).
- Préremplir les lignes de facture avec les articles utilisés (qty nette > 0) des interventions choisies ; l’utilisateur peut encore ajuster les lignes avant validation (overlay existant, source « lignes »).
- Persister le lien facture → interventions et mettre à jour le `billingStatus` des interventions concernées (et du dossier si encore `none`).
- Documenter le parcours (assistant / product docs) : facturer depuis les interventions du dossier.

## Capabilities

### New Capabilities

- `intervention-articles`: sélection searchable des articles consommés sur une intervention

### Modified Capabilities

- `client-invoicing`: émettre une facture complète à partir d’une ou plusieurs interventions d’un même dossier (lignes issues des consommations, lien persisté, statuts)

## Impact

- Frontend : `InterventionArticlesDialog`, `SearchableSelect`, fiche dossier (`CaseDetailPage`), overlay `CreateCaseInvoiceOverlay`.
- Contrats `@planwise/shared` : `CreateLocalInvoiceBody` / `LocalInvoiceResponse` / `SyncCaseInvoiceOptions` (`interventionIds`).
- Gateway facturation + billing-service : persistance des ids d’intervention ; gateway cases : upgrade `billingStatus` des interventions (et du dossier si `none`).
- Docs produit / chunks assistant ; tests unitaires gateway + E2E parcours facture depuis intervention(s).
- Permissions inchangées (`stock.interventions.*`, `billing.invoices.create`). Pas de facture multi-dossiers.
