## Why

Les factures s’émettent dans Planwise (PDF, cycle de vie) mais l’utilisateur ne peut pas les envoyer au client depuis l’app. Il doit télécharger le PDF et passer par sa messagerie, sans trace dans le dossier. L’envoi in-app, confirmé puis historisé, referme le parcours de facturation.

## What Changes

- Envoi d’une facture (ou d’un avoir) par e-mail, avec le **PDF en pièce jointe**.
- **Popup de validation** avant envoi : destinataire(s), objet, message, mention du PDF joint, confirmation explicite.
- **Suivi des envois** : journal append-only (date, destinataires, auteur, succès/échec) visible depuis le dossier et l’écran Facturation.
- Permission dédiée `billing.invoices.send` (gateway + UI).
- Extension de l’e-mail transactionnel SMTP pour accepter une pièce jointe (aujourd’hui : corps + CTA seulement).

## Capabilities

### New Capabilities

- `invoice-email`: envoi e-mail d’une facture émise (confirmation, PDF joint, journal des envois, permissions, surfaces dossier et `/billing`).

### Modified Capabilities

- (aucune — `openspec/specs/` est vide ; le moteur de facturation local est décrit dans le change `remove-billing-connector-and-create-local-billing-engine` / `client-invoicing`.)

## Impact

- **billing-service** : `POST /invoices/:id/send`, génération PDF, appel notifications-service, persistance du journal sur le document facture ; migrate-mongo.
- **notifications-service** : e-mail transactionnel avec pièce(s) jointe(s) (base64 + filename).
- **api-gateway** : route scoped, `@RequirePermissions("billing.invoices.send")`, passage de l’identité de l’émetteur.
- **shared** : DTO envoi / journal, permission, types e-mail (attachments).
- **frontend** : `FormDialog` de confirmation (dossier + `/billing`), bouton Envoyer, historique des envois.
- **docs / assistant** : parcours devis-facturation, FAQ offline si pertinent.
- **Hors scope** : envoi automatique à la validation, envoi de devis par e-mail, e-facture PDP, relances de paiement planifiées.
