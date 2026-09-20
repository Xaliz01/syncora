## Purpose

Permettre à un utilisateur autorisé de générer un brouillon de compte-rendu d'intervention par l'IA, de l'éditer, puis de le valider. Le texte validé est enregistré sur l'intervention et visible sur Ma journée, la fiche dossier et le rapport PDF. Il n'est jamais envoyé au client.

## ADDED Requirements

### Requirement: Propose a field report from voice or photos

The system SHALL allow an authorized user to request an AI draft report for a completed intervention in their organization. The draft MUST be built only from that intervention's notes, timestamps, and attached photos (and an optional voice transcript). The system MUST show the draft for edit and MUST NOT persist it as the official report until the user confirms. If the model is unavailable, the system MUST keep the raw inputs and tell the user to retry.

#### Scenario: User confirms edited draft

- **WHEN** a user with intervention write confirms a draft after editing
- **THEN** the system stores the confirmed text on the intervention and MUST NOT send it to the customer

#### Scenario: User discards draft

- **WHEN** the user dismisses the draft
- **THEN** the system MUST NOT change the intervention report fields

#### Scenario: LLM unavailable

- **WHEN** the user requests a draft but the LLM is unavailable
- **THEN** the system MUST show an error message and allow the user to retry without losing input data

### Requirement: Trial can use a limited field-report quota

An organization on a valid trial MUST be able to request field-report drafts without purchasing the copilote addon, up to the documented trial cap. Exhausting the trial cap MUST show a user-facing limit message and MUST NOT call the model. After the trial, the essentiel monthly cap applies unless the copilote addon (or Pro) is active.

#### Scenario: Trial user confirms a draft

- **WHEN** a trialing org with remaining trial quota confirms a draft
- **THEN** the system stores the confirmed text and decrements the trial quota

#### Scenario: Trial quota exhausted

- **WHEN** a trialing org has used the trial field-report cap
- **THEN** the system MUST NOT call the model and MUST explain that the Copilote option continues this after the trial

### Requirement: Field report visible on case detail and PDF

The confirmed field report MUST be displayed on the intervention section of the case detail page (fiche dossier). It MUST also appear in the intervention PDF report as a « Compte-rendu » section. Both surfaces MUST show the same text stored on the intervention.

#### Scenario: Field report on case detail page

- **WHEN** a user with case read permission opens a case containing an intervention with a confirmed field report
- **THEN** the field report text is visible in the intervention section

#### Scenario: Field report in PDF

- **WHEN** a user downloads the PDF report for an intervention with a confirmed field report
- **THEN** the PDF includes a « Compte-rendu » section with the confirmed text

### Requirement: Permission gate

Only users with the `ai.field_report` permission (or admin role) MUST be able to generate or confirm a field report. The generate button MUST be hidden for users without the permission.

#### Scenario: Member without permission

- **WHEN** a member without `ai.field_report` views a completed intervention
- **THEN** they MUST NOT see the generate button, though they CAN see an already-confirmed report

### Requirement: Addon entitlement

The field report generation MUST require the `ai_copilot` addon (purchased or included via trial). An organization without the addon and not on trial MUST NOT be able to generate reports. The system MUST show a user-facing message explaining how to get access.

#### Scenario: Active org without copilot addon

- **WHEN** an active (non-trial) org without `ai_copilot` attempts to generate a report
- **THEN** the system MUST reject the request with a message about the Copilote option
