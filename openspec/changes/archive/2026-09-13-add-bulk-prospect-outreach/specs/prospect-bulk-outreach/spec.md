## Purpose

Permettre au staff backoffice d’envoyer le même e-mail de prospection à une sélection de prospects suivis, après filtre et décochage, et de consulter l’historique des e-mails déjà envoyés à chaque prospect.

## ADDED Requirements

### Requirement: Select tracked prospects for a bulk send

The system SHALL let an authenticated platform staff member select one or more **tracked** prospects on `/platform/prospection` (current page, or the full filtered result when its size is within the send cap). The staff member MUST be able to uncheck individual selected rows before sending. Changing the tracked list filters MUST not send mail by itself.

#### Scenario: Select all on the current page then uncheck one

- **WHEN** the staff member selects all tracked prospects on the current page and unchecks one row
- **THEN** the remaining checked rows stay selected and the bulk action shows the updated count

#### Scenario: Select the filtered list within the cap

- **WHEN** the staff member filters tracked prospects (for example status « Contacté ») and the filtered total is at most 200
- **THEN** the system offers to select that filtered set and the staff member can uncheck individual rows before sending

#### Scenario: Filtered list exceeds the cap

- **WHEN** the filtered tracked total is greater than 200
- **THEN** the system MUST NOT offer a one-click select-all of that full set and MUST ask the staff member to refine the filters

### Requirement: Confirm and send one template to the selection

The system SHALL send the chosen `prospect_outreach` e-mail template to every selected tracked prospect that has a valid destination e-mail, after an explicit confirmation that states the template name and the number of recipients. Already-contacted selected prospects MUST be included (resend). Recipients without a valid e-mail MUST be omitted from the send and counted as skipped. A failed send to one recipient MUST NOT prevent sending to the others. The system MUST reject a batch larger than 200 recipients and MUST NOT send any message in that case.

#### Scenario: Bulk send after confirmation

- **WHEN** the staff member confirms a bulk send with a valid template and at least one selected prospect that has a valid e-mail
- **THEN** each eligible recipient receives that template (placeholders resolved per company) and each attempt is appended to that prospect’s send history as for a single send

#### Scenario: Missing e-mail is skipped

- **WHEN** the selection includes a prospect without a valid e-mail and others with a valid e-mail
- **THEN** the system sends to the valid addresses, skips the invalid ones, and reports both counts

#### Scenario: Cancel confirmation

- **WHEN** the staff member cancels the confirmation dialog
- **THEN** the system MUST NOT send any outreach e-mail

#### Scenario: Batch over the cap

- **WHEN** the client submits more than 200 recipients
- **THEN** the system rejects the request and sends no e-mail

### Requirement: Report bulk send results

After a bulk send attempt, the system SHALL show a per-batch summary with counts of sent, failed, and skipped recipients so the staff member can retry the failed ones.

#### Scenario: Mixed outcome

- **WHEN** a confirmed bulk send completes with at least one success and at least one failure or skip
- **THEN** the summary includes each of those counts and the tracked list reflects the updated outreach statuses and send history

### Requirement: Per-prospect send history

The system SHALL keep an append-only history of outreach e-mail attempts for each tracked prospect. Each sent or failed attempt MUST record at least the content identity (template name and/or subject), the send timestamp, the destination e-mail, and whether it succeeded. A later send MUST NOT remove or overwrite earlier history entries. Staff MUST be able to open that history from the prospect’s row on `/platform/prospection`. Status-only updates (`noted`, `email_not_found`) MUST NOT add a send-history entry.

#### Scenario: Resend keeps the previous send

- **WHEN** the staff member sends (or resends) an outreach e-mail to a prospect who already has a prior send
- **THEN** the history lists both attempts with their timestamps and content identities

#### Scenario: Open history from the list

- **WHEN** the staff member opens the history of a tracked prospect who has at least one send
- **THEN** the system shows each attempt newest first with content identity, date, destination, and sent or failed

#### Scenario: Never mailed

- **WHEN** the staff member opens the history of a prospect who was only noted or marked e-mail-not-found
- **THEN** the system shows an empty history and MUST NOT invent a send entry
