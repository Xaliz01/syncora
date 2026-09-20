## Why

Un artisan termine une intervention le soir et rédige son compte-rendu sur WhatsApp ou Excel — souvent incomplet, souvent jamais classé. Planwise peut proposer un brouillon de compte-rendu dès la fin de l'intervention, à partir des données déjà saisies (titre, notes terrain, horaires, type). L'utilisateur relit, corrige et valide. Le texte validé reste attaché à l'intervention comme preuve interne ; il n'est jamais envoyé au client sans action explicite.

C'est la première tranche IA du programme copilote (A1 dans `docs/assistant/ROADMAP.md`). Elle pose également le socle technique pour toutes les features IA à venir : addon `ai_copilot`, quotas mensuels par organisation, entitlement essai/essentiel/copilote.

## What Changes

- Sur une **intervention terminée** (Ma journée + fiche dossier), un bouton « Préremplir le compte-rendu » appelle l'IA pour générer un brouillon.
- Le brouillon s'affiche dans un dialog d'édition. L'utilisateur peut modifier le texte puis le **confirmer** ou l'**annuler**.
- Le texte confirmé est enregistré sur l'intervention (`fieldReport`, `fieldReportConfirmedAt`). Il est visible sur Ma journée, sur la fiche dossier, et dans le rapport PDF.
- Annuler ne modifie rien sur l'intervention.
- Si le modèle LLM est indisponible, un message d'erreur est affiché et l'utilisateur peut réessayer.
- **Addon `ai_copilot`** (7,99 €/mois) ajouté au catalogue, inclus dans l'essai (quotas plafonnés).
- **Quotas mensuels** par organisation : essai 20 (total), essentiel 15/mois, copilote 120/mois. Dépassement → message utilisateur, pas d'appel LLM.
- **Permission** `ai.field_report` contrôle l'accès côté API et côté UI.

## Capabilities

### New Capabilities

- `ai-field-report` : génération IA de compte-rendu d'intervention, édition, confirmation, affichage sur fiche et PDF, quota et entitlement copilote.

### Modified Capabilities

- (aucune)

## Impact

- **@planwise/shared** : addon `ai_copilot` dans `ADDON_CODES` / `ADDON_CATALOG` / `TRIAL_INCLUDED_ADDON_CODES` ; types quota IA (`AiUsageKey`, `AiQuotaTier`, `AI_QUOTA_LIMITS`) ; DTOs field report ; permission `ai.field_report` ; champs `fieldReport` / `fieldReportConfirmedAt` sur `InterventionResponse` ; `normalizeFieldReportText` pour nettoyer les réponses LLM JSON.
- **cases-service** : champs `fieldReport` + `fieldReportConfirmedAt` sur le schema Mongoose ; endpoint `POST /interventions/:id/field-report` ; migration `20260920100000`.
- **subscriptions-service** : schema `AiQuotaCounter` (compteur mensuel par org/usage/period) ; `AiQuotaService` ; endpoints `GET /ai-quota/status`, `POST /ai-quota/increment`.
- **api-gateway** : module `AiFieldReportModule` ; service orchestrant entitlement → quota → LLM → confirm ; endpoints `POST /ai/field-report/generate`, `POST /ai/field-report/confirm`, `GET /ai/field-report/quota` ; réutilise `AssistantLlmClient` existant ; guards `JwtAuthGuard` + `RequirePermissionGuard`.
- **api-gateway PDF** : section « Compte-rendu » dans le rapport PDF si `fieldReport` est renseigné.
- **frontend** : `FieldReportDialog` (génération → édition → confirmation) ; bouton « Préremplir le compte-rendu » sur Ma journée et fiche dossier ; affichage inline du compte-rendu confirmé sur les deux écrans ; label permission dans `permissions-catalog.ts`.
- **Hors scope** : envoi automatique au client ; création de facture ; dictée vocale vers le LLM ; analyse de photos par le LLM ; inventaire pièces hors catalogue.
