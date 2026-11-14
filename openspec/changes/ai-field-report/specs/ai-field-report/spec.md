# Delta for ai-field-report

## ADDED Requirements

### Requirement: Propose a field report from voice or photos

The system SHALL allow an authorized user to request an AI draft report for an intervention in their organization from a spoken or typed instruction. The draft MUST be built only from that intervention’s notes, timestamps, and the instruction. The system MUST show the draft for edit and MUST NOT persist it as the official report until the user confirms. If the model is unavailable, the system MUST keep the raw instruction and tell the user to retry. Confirming MUST NOT send the report to the customer.

#### Scenario: User confirms edited draft

- **WHEN** a user with intervention write and `ai.field_report` confirms a draft after editing
- **THEN** the system stores the confirmed text on the intervention and MUST NOT send it to the customer

#### Scenario: User discards draft

- **WHEN** the user dismisses the draft
- **THEN** the system MUST NOT change the intervention report fields

### Requirement: Trial can use a limited field-report quota

An organization on a valid trial MUST be able to request copilote drafts without purchasing the copilote addon, up to the documented trial cap for voice instructions. Exhausting the trial cap MUST show a user-facing limit message and MUST NOT call the model. After the trial, the essentiel monthly cap applies unless the copilote addon is active.

#### Scenario: Trial user confirms a draft

- **WHEN** a trialing org with remaining trial quota confirms a draft
- **THEN** the system stores the confirmed text and the trial quota has been decremented for the interpretation

#### Scenario: Trial quota exhausted

- **WHEN** a trialing org has used the trial voice-instruction cap
- **THEN** the system MUST NOT call the model and MUST explain that the Copilote option continues this after the trial

### Requirement: Dictate proposed CRM actions from any screen

The system SHALL offer a dictation control on every authenticated application screen. An instruction MAY propose one or more of: field report, customer create or update, quote draft, case note, follow-up appointment. Unsupported or ambiguous instructions MUST be stored in history with a clear explanation and MUST NOT write CRM records. Quote prices MUST come from the user, not the model. CRM writes MUST happen only after confirmation, and only for actions the user is allowed to perform.

#### Scenario: Rejected instruction writes nothing

- **WHEN** the user rejects the proposed actions
- **THEN** no customer, quote, comment, intervention, or field report is created or updated

#### Scenario: History shows the utterance and the outcome

- **WHEN** a user with `ai.copilot` opens the copilote history
- **THEN** they see their organization's instructions, the transcript, the decision, and links to resulting records they are allowed to open, and MUST NOT see another organization's sessions
