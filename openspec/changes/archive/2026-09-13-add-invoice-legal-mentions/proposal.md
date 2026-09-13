## Why

Les factures locales Planwise n’affichent aujourd’hui que le nom, le SIRET et l’adresse de l’émetteur, plus un pied de page « Généré par Planwise ». Elles omettent les mentions obligatoires du droit français (identité juridique complète, TVA, conditions de paiement, pénalités de retard, indemnité forfaitaire de 40 €, escompte). Sans ces mentions, les factures générées ne sont pas réglementaires pour un artisan / TPE.

## What Changes

- Ajouter au profil organisation les **données d’identité juridique** nécessaires à une facture (forme juridique, capital social, RCS + ville, n° TVA intracommunautaire), éditables sur `/organization/edit` avec le droit `organizations.update`.
- Ajouter des **mentions de facture éditables** (textes) au niveau organisation, préremplies avec des **défauts conformes au droit français** (Code de commerce L441-10, indemnité forfaitaire 40 €, escompte / absence d’escompte, et mention TVA 293 B CGI si franchise).
- Permettre de **restaurer les mentions par défaut** sans perdre l’identité juridique saisie.
- Afficher ces mentions (et l’identité enrichie) sur le **PDF des factures** (brouillon et émises), en les **figeant au moment de la création** (pas de recalcul live à la lecture PDF) pour que le document émis reste stable.
- Afficher un aperçu / rappel sur la fiche organisation : les mentions s’appliqueront aux prochaines factures.

## Capabilities

### New Capabilities

- `invoice-legal-mentions`: paramétrage organisation des mentions et de l’identité juridique de facturation, avec défauts réglementaires français et restauration des textes par défaut.

### Modified Capabilities

- `client-invoicing`: le PDF de facture DOIT inclure l’identité juridique enrichie et les mentions réglementaires de l’organisation (snapshot), pas seulement SIRET + adresse.

## Impact

- `packages/shared` : types organisation + snapshot vendeur facture + textes de mentions par défaut.
- `organizations-service` : schéma, migration Mongo, PATCH `/organizations/mine`.
- `billing-service` : snapshot mentions sur la facture, rendu PDF (`invoice-pdf.ts`).
- `api-gateway` : transmission du snapshot à la création de facture (et preview PDF).
- Frontend : `/organization` et `/organization/edit` (section facturation / mentions).
- Assistant produit : `docs/product/glossary.md`, `routes.md`, chunks embarqués si l’écran devient un sujet utilisateur.
- Hors scope : devis PDF, facturation électronique (Chorus / e-invoicing 2026+), mentions Planwise marketing, connecteurs Qonto/Pennylane.
