## Why

Le backoffice Prospection n’envoie qu’un e-mail à la fois. Relancer une liste déjà contactée (ou un sous-ensemble filtré) oblige à cliquer ligne par ligne. Un envoi groupé, à partir de la liste filtrée et d’un contenu choisi, referme le parcours de relance. Aujourd’hui un renvoi **écrase** sujet et date : on ne sait plus quel contenu a déjà été envoyé, ni quand.

## What Changes

- Sur **Prospects suivis**, permettre de **sélectionner** des lignes (case à cocher), y compris « tout sélectionner » sur la page ou sur le résultat filtré, puis **décocher** certains destinataires.
- Choisir **un contenu e-mail** (templates `prospect_outreach` existants) et l’appliquer à **toute la sélection** après confirmation.
- Endpoint d’envoi **en masse** côté gateway : même rendu de template et même journal que l’envoi unitaire ; résultats par destinataire (envoyé / échec / ignoré).
- Plafond de volume et exclusion des lignes sans e-mail valide, sans interrompre le reste du lot.
- **Historique des envois par prospect** : chaque envoi (unitaire ou groupé) ajoute une entrée (contenu / objet, date, destinataire, succès ou échec) sans effacer les précédentes ; consultable depuis la ligne du prospect.

## Capabilities

### New Capabilities

- `prospect-bulk-outreach`: sélection multi-prospects sur la liste suivie (filtres + décochage), envoi groupé d’un même contenu e-mail, et historique des e-mails envoyés par prospect.

### Modified Capabilities

- (aucune — l’envoi unitaire et les templates backoffice n’ont pas de spec OpenSpec aujourd’hui.)

## Impact

- **api-gateway** : `POST /platform/prospects/outreach/bulk` (staff JWT), réutilisation de l’envoi unitaire (template, SMTP, journal users-service) ; l’envoi unitaire existant alimente le même historique.
- **shared** : DTO lot (destinataires, `templateId`, bilan par SIREN) et entrées d’historique sur `ProspectOutreachResponse`.
- **frontend** : `/platform/prospection` — cases à cocher, barre d’action, `FormDialog` / confirm, template déjà présent en tête de page, historique par ligne.
- **users-service** : tableau append-only `emailSends` sur `prospect_outreaches` + migrate-mongo (backfill du dernier envoi connu). Pas de nouvelle collection.
- **notifications-service** : inchangé.
- **Hors scope** : envoi groupé depuis la recherche Pappers ; file d’attente / cron ; personnalisation différente par destinataire au-delà des placeholders déjà interpolés ; nouveaux templates ; corps HTML complet dans l’historique (nom du contenu + objet suffisent).
