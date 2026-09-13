## Why

Sur le terrain, une intervention consomme souvent des **prestations** (main-d’œuvre, forfaits) en plus des articles stockés. Aujourd’hui seuls les articles peuvent être enregistrés comme consommation : les prestations restent absentes du dialogue d’usage et du préremplissage de facture depuis une intervention, alors qu’elles existent déjà au catalogue et sur les devis / lignes libres.

## What Changes

- Permettre d’enregistrer une **prestation comme consommation** sur une intervention (quantité, sans mouvement de stock ni emplacement).
- Étendre le dialogue d’usages d’intervention pour choisir articles **et** prestations via un sélecteur searchable (catalogue mixte).
- Persister et relire ces usages (API stock + contrats `@planwise/shared`), isolés par organisation.
- Inclure les prestations (qty > 0) dans le **préremplissage** des factures créées depuis une ou plusieurs interventions (prix / TVA catalogue).
- Documenter le parcours (product docs / assistant) : articles et prestations sur une intervention.

## Capabilities

### New Capabilities

- `intervention-prestation-usage`: enregistrer, modifier et relire les prestations consommées sur une intervention (hors stock)

### Modified Capabilities

- `client-invoicing`: le préremplissage d’une facture depuis des interventions inclut aussi les prestations consommées (lignes `prestationId`)

## Impact

- `@planwise/shared` : contrats usage prestation + helpers de lignes facture.
- `stock-service` : nouveau modèle / service d’usage prestation (pas de stock movement), migrate-mongo, HTTP ; gateway proxy + permissions existantes (`stock.interventions.*`, `prestations.read`).
- Frontend : dialogue d’usages intervention (picker mixte), chargement/sauvegarde des prestations ; `CaseDetailPage` / overlay facture pour agréger usages articles + prestations.
- Docs produit / chunks assistant ; tests unitaires stock/gateway/shared + E2E parcours.
- Pas de nouvelle permission ; pas de facturation multi-dossiers ; pas de création rapide de prestation depuis le dialogue terrain.
