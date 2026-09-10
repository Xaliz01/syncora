## Purpose

Politique produit des connecteurs de facturation : masquer Qonto, Pennylane et la démo, arrêter leur synchronisation automatique, et informer que l’émission en facturation électronique arrivera via le provider exclusif.

## ADDED Requirements

### Requirement: Hide third-party billing connectors in the app

The authenticated application MUST NOT offer connect, disconnect, OAuth, or “send invoice to provider” actions for Pennylane, Qonto, or demo billing. Settings → Intégrations MUST NOT present those providers as available billing tools. Public gateway reads of provider connection status MUST return Gone (410) with the same unavailable message as connect/sync. Existing credentials and `integration_syncs` traces MUST be retained (ledger) and MUST NOT be hard-deleted by this change. Adapter source and unused UI modules MAY remain in the repository as long as they are not exposed in the active product paths.

#### Scenario: Integrations page

- **WHEN** a user opens Paramètres → Intégrations
- **THEN** the UI does not show Pennylane, Qonto, or facturation démo as connectable billing providers

#### Scenario: Provider status API

- **WHEN** a client calls GET connection status for Pennylane, Qonto, or demo billing
- **THEN** the gateway responds 410 Gone and does not proxy the request to the integrations-service

#### Scenario: Case invoice actions

- **WHEN** a user opens a case that previously could sync to a provider
- **THEN** the UI offers local invoicing (or a path to it) and does not show “Créer une facture Pennylane/Qonto/démo”

### Requirement: Disable invoice-sync cron

The scheduled job that refreshed remote Pennylane/Qonto invoice statuses MUST NOT run in production after this change. The platform cron catalogue MUST reflect that the job is disabled or removed from active schedules so `/platform/crons` does not imply a live sync.

#### Scenario: Scheduler idle

- **WHEN** the integrations-service process is running
- **THEN** it MUST NOT periodically call remote billing APIs to refresh invoice syncs

### Requirement: Upcoming e-invoicing notice

Where users create or list customer invoices, the UI MUST display a user-facing notice that **electronic invoicing emission** will be available later (exclusive provider). The notice MUST NOT mention Qonto or Pennylane. The notice MUST NOT claim that Planwise already handles mandatory e-invoice **reception** (1 September 2026) or that emission is already mandated (not before September 2027).

#### Scenario: Notice on billing surfaces

- **WHEN** a user views the billing follow-up page or the invoice creation flow
- **THEN** they see a short message that e-invoicing emission is coming soon

#### Scenario: No vendor names on public or in-app billing copy for this notice

- **WHEN** the upcoming e-invoicing message is shown
- **THEN** the copy does not name Qonto or Pennylane
