## Why

Planwise orchestre aujourd’hui les factures uniquement via Qonto, Pennylane ou un mode démo, alors que le connecteur exclusif de facturation électronique n’est pas encore disponible. Les utilisateurs n’ont plus de chemin de facturation classique alors que l’**émission** électronique n’est obligatoire qu’en septembre 2027 (la **réception** l’est depuis le 1er septembre 2026, hors scope Planwise tant que le PDP n’est pas branché). Il faut masquer les connecteurs existants, arrêter leur sync, et émettre des factures **dans Planwise** en attendant.

## What Changes

- **BREAKING** (produit) : plus de connexion ni d’envoi vers Qonto / Pennylane / démo dans l’app ; plus de cron `integrations.invoice-sync` actif. Le code des adapters peut rester, non exposé.
- Nouveau **microservice `billing-service`** : facturation classique (création, numérotation, PDF, cycle de vie, avoirs), scoped `organizationId`.
- Création de facture **depuis un devis** (et lignes libres si déjà prévu) avec les types **complète, situation, acompte, solde**, plus **avoir**.
- Raccordement dossiers (`billingStatus`), écran `/billing`, permissions, assistant / docs produit.
- Message in-app : l’**émission via facturation électronique** arrivera prochainement (provider exclusif, pas Qonto/Pennylane).
- Abonnement Stripe Planwise inchangé.

## Capabilities

### New Capabilities

- `client-invoicing`: moteur local de factures clients (types, devis → facture, avoir, PDF, suivi, mentions légales minimales).
- `billing-connectors`: politique d’exposition des connecteurs (masqués, cron arrêté) et communication « facturation électronique bientôt ».

### Modified Capabilities

- (aucune — `openspec/specs/` est vide ; tout le comportement facturation clients est décrit dans les nouvelles capacités.)

## Impact

- **Nouveau** : `services/billing-service`, image CD, `SERVICE_URLS`, gateway routes, migrate-mongo, permissions `billing.*`.
- **Frontend** : Intégrations, overlay dossier, `/billing`, bandeau e-facturation.
- **integrations-service** : scheduler désactivé ; UI/API publiques des providers masquées ou 410/404 métier ; traces historiques conservées (ledger).
- **shared** : types facture locale distincts des DTOs provider ; catalogue cron.
- **Docs / assistant** : journeys devis-facturation et intégrations.
- **Hors scope** : PDP / réception e-facture, connecteur e-émission, suppression du code Qonto/Pennylane, refonte Stripe.
