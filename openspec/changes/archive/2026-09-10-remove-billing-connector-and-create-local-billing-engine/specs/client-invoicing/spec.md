## Purpose

Facturation classique des clients dans Planwise : émettre, numéroter, PDF, suivre et avoiriser des factures rattachées à un dossier et, le cas échéant, à un devis, sans outil de facturation tiers.

## ADDED Requirements

### Requirement: Invoice issuance from a quote

The system SHALL allow an authorized user to create a customer invoice from an accepted quote on a case. The invoice MUST copy billable lines (or a documented subset for situation / deposit / balance), VAT, amounts, and the billing party (order giver if set, otherwise customer). Custom lines MAY be used only when the product already allows them; they MUST force invoice kind `full`.

#### Scenario: Create full invoice from quote

- **WHEN** a user with invoice create permission submits a full invoice from an accepted quote
- **THEN** the system persists a numbered invoice in the organization, linked to the case and quote, with lines and totals matching the quote

#### Scenario: Reject invoice without accepted quote

- **WHEN** the case has no accepted quote (or the requested quote is not accepted) and the user requests an invoice from quote
- **THEN** the system MUST reject the request with a user-facing error and MUST NOT create an invoice

### Requirement: Invoice kinds

The system SHALL support invoice kinds `full` (facture complète), `situation` (with sequence number and percent), `deposit` (acompte), `balance` (solde), and `credit_note` (avoir). A credit note MUST reference the original invoice and reverse its amounts (or a documented partial amount). Situation invoices MUST increment situation numbering per case (or per quote — one consistent rule per organization).

#### Scenario: Situation invoice

- **WHEN** a user creates a situation invoice at 40 % on a quote already situation-invoiced at 20 %
- **THEN** the system records kind `situation`, the next situation number, 40 %, and lines/amounts consistent with that share

#### Scenario: Credit note

- **WHEN** a user issues a credit note against a finalized local invoice
- **THEN** the system creates a `credit_note` document linked to the original invoice, with a new number in the credit-note or invoice sequence as defined for the org, and does not delete the original invoice

### Requirement: Numbering and legal document

Each organization MUST have sequential, gap-free numbering for issued (non-draft) invoices, scoped to the organization. Drafts MAY use a separate draft numbering. A finalized invoice MUST be downloadable as PDF including seller identity, buyer identity, dates, lines, VAT, totals, and invoice number. Soft-delete (cancel) of **draft** invoices MUST remove them from active lists via `deletedAt` and MUST NOT allocate or free a fiscal number. Issued (finalized/paid) invoices MUST NOT be soft-deleted; cancellation of issued documents is done via credit note, preserving history and numbers.

#### Scenario: Sequential numbers

- **WHEN** two invoices are finalized in sequence for the same organization
- **THEN** their issued numbers MUST be consecutive according to the organization sequence

#### Scenario: Soft-delete draft

- **WHEN** a user cancels a draft invoice
- **THEN** the draft is soft-deleted (`deletedAt`), disappears from active lists, and the organization fiscal sequence is unchanged

#### Scenario: PDF

- **WHEN** a user downloads a finalized invoice
- **THEN** the system returns a PDF that includes number, parties, lines, VAT and totals

### Requirement: Lifecycle and case billing status

Invoices MUST support at least draft, finalized, paid, and cancelled (or equivalent). Creating or finalizing invoices MUST update the case `billingStatus` using the existing ranks (`to_invoice`, `invoice_draft`, `partially_invoiced`, `invoiced`, `paid`) so lists and banners stay consistent. Historical Qonto/Pennylane/demo sync rows MAY remain visible as read-only traces but MUST NOT be required to create a local invoice.

#### Scenario: Draft then finalize

- **WHEN** a user creates a draft then finalizes it
- **THEN** the invoice becomes non-editable for amounts/lines (except cancellation / credit note) and the case billing status advances accordingly

#### Scenario: Follow-up list

- **WHEN** a user with billing follow-up permission opens `/billing`
- **THEN** the list includes local invoices for the organization with kind, status, amounts, case link, and pagination (`limit` / `offset` / `total`)

### Requirement: Permissions and tenant isolation

Invoice read/create/finalize/credit MUST be gated by assignable permission codes (gateway + UI). Every persisted invoice MUST be filtered by `organizationId`. Users MUST NOT read another organization's invoices.

#### Scenario: Cross-org denied

- **WHEN** a client requests an invoice id belonging to another organization
- **THEN** the system MUST respond as not found or forbidden and MUST NOT return the document
