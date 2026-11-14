# Design

## Entry

`POST /ai/copilot/sessions` transcrit déjà (Web Speech ou texte de repli). Le serveur réserve un quota `copilot_voice` (mêmes plafonds que le compte-rendu A1 : essai 20, Essentiel 15/mois, copilote 120/mois), appelle `AssistantLlmClient`, puis stocke une session. Le modèle ne reçoit que les fiches que l'utilisateur a le droit de lire (dossier ouvert, intervention du jour, client ouvert). Les identifiants hors de cette liste sont ignorés.

## Confirmation

`POST /ai/copilot/sessions/:id/decide` avec `reject` ne touche aucun port CRM. `confirm` valide d'abord droits et prix saisis, puis seulement appelle les services existants (client, dossier, devis brouillon, commentaire, intervention, `confirmFieldReport`). Le compte-rendu confirmé est un champ de l'intervention et une section du PDF. Il n'est pas envoyé.

## Quotas et droits

Palier : essai si `trialing`, copilote si l'addon `ai_copilot` est actif, sinon Essentiel. Sans abonnement : refus. Sans `ai.copilot` : refus. Chaque action exige en plus le droit métier (`ai.field_report` + `interventions.update` pour le compte-rendu). L'historique est filtré par `organizationId`.

## Audio

Optionnel, plafonné (~1,5 Mo), servi par `GET /ai/copilot/sessions/:id/audio`. La transcription reste la source de l'interprétation.
