## Purpose

Permettre à un utilisateur autorisé d’envoyer une facture ou un avoir émis par e-mail, après confirmation, avec le PDF joint et un journal consultable des envois.

## ADDED Requirements

### Requirement: Send issued invoice by email

The system SHALL allow an authorized user to send an issued customer invoice or credit note by e-mail to one or more recipients, with the invoice PDF attached. The system MUST prefill the primary recipient from the invoice party e-mail when present. The user MUST be able to edit the recipient(s), subject, and message before sending. Draft and cancelled invoices MUST NOT be sendable.

#### Scenario: Send finalized invoice

- **WHEN** a user with send permission confirms sending a finalized invoice to a valid e-mail address
- **THEN** the system sends an e-mail whose attachment is the invoice PDF and whose body uses the confirmed subject and message

#### Scenario: Reject draft invoice send

- **WHEN** a user requests to send an invoice still in draft status
- **THEN** the system MUST reject the request with a user-facing error and MUST NOT send an e-mail

#### Scenario: Reject cancelled invoice send

- **WHEN** a user requests to send a cancelled invoice
- **THEN** the system MUST reject the request with a user-facing error and MUST NOT send an e-mail

#### Scenario: Missing or invalid recipient

- **WHEN** the user confirms send without a valid recipient e-mail
- **THEN** the system MUST reject the request with a user-facing error and MUST NOT send an e-mail

### Requirement: Confirmation before send

The system SHALL require an explicit confirmation dialog before any invoice e-mail is sent. The dialog MUST show the recipient(s), subject, message, and that the PDF will be attached. Cancelling the dialog MUST NOT send an e-mail and MUST NOT append a send log entry.

#### Scenario: User cancels confirmation

- **WHEN** the user opens the send dialog and cancels without confirming
- **THEN** the system MUST NOT send an e-mail and MUST NOT record a send attempt

#### Scenario: User confirms after editing recipient

- **WHEN** the user changes the recipient in the dialog and confirms
- **THEN** the system sends to the edited address, not the original prefilled value if it differs

### Requirement: Send history

Each send attempt MUST be recorded on the invoice as an append-only log entry including at least: timestamp, recipient(s), sending user identity, outcome (sent or failed), and a failure reason when the outcome is failed. Successful and failed attempts MUST both be recorded. The history MUST be visible on the case invoice panel and on the billing follow-up list. Users MAY resend an already sent invoice; each resend MUST add a new log entry. Send history MUST NOT be deleted when the invoice is later cancelled or soft-deleted from active lists.

#### Scenario: Successful send is listed

- **WHEN** an e-mail is sent successfully
- **THEN** the invoice send history includes a sent entry with date, recipient(s), and the sending user

#### Scenario: Failed send is listed

- **WHEN** the e-mail provider rejects or cannot deliver the message
- **THEN** the invoice send history includes a failed entry with a reason, and the user sees a user-facing error

#### Scenario: Resend

- **WHEN** a user sends the same issued invoice a second time
- **THEN** the system sends again and the history contains two distinct entries

### Requirement: Permissions and tenant isolation

Sending an invoice MUST require an assignable permission distinct from read-only access. Users with only invoice read MUST see send history but MUST NOT see the send action. Every send MUST be scoped to the invoice’s `organizationId`. Users MUST NOT send or read send history for another organization’s invoices.

#### Scenario: Read-only user cannot send

- **WHEN** a user with invoice read but without send permission views an issued invoice
- **THEN** the system MUST NOT expose the send action and MUST reject a direct send API call

#### Scenario: Cross-org send denied

- **WHEN** a client requests to send an invoice id belonging to another organization
- **THEN** the system MUST respond as not found or forbidden and MUST NOT send an e-mail
