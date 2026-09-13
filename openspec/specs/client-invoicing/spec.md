# client-invoicing Specification

## Purpose

Facturation classique des clients dans Planwise : émettre, numéroter, PDF, suivre et avoiriser des factures rattachées à un dossier et, le cas échéant, à un devis, sans outil de facturation tiers.

## Requirements

### Requirement: Invoice issuance from a quote

The system SHALL allow an authorized user to create a customer invoice from an accepted quote on a case. The invoice MUST copy billable lines (or a documented subset for situation / deposit / balance), VAT, amounts, and the billing party (order giver if set, otherwise customer). Custom lines MAY be used only when the product already allows them; they MUST force invoice kind `full`.

#### Scenario: Create full invoice from quote

- **WHEN** a user with invoice create permission submits a full invoice from an accepted quote
- **THEN** the system persists a numbered invoice in the organization, linked to the case and quote, with lines and totals matching the quote

#### Scenario: Reject invoice without accepted quote

- **WHEN** the case has no accepted quote (or the requested quote is not accepted) and the user requests an invoice from quote
- **THEN** the system MUST reject the request with a user-facing error and MUST NOT create an invoice

### Requirement: Invoice issuance from selected interventions

The system SHALL allow an authorized user (`billing.invoices.create`) to create a customer invoice of kind `full` from one intervention or from several interventions that belong to the **same case**. The invoice MUST remain linked to that case and to the billing party (order giver if set, otherwise customer). Prefill MUST use net article usage (qty > 0) of the selected interventions, with catalog unit prices when available; the user MUST be able to edit, add, or remove lines before submit. The persisted invoice MUST store the selected intervention ids. Creating this invoice MUST NOT require an accepted quote. If the case `billingStatus` is `none`, the system MUST still allow the create (provided a billing party exists) and MUST advance the case status with the existing invoice lifecycle. Selected interventions MUST have their `billingStatus` advanced consistently with the invoice (draft → `invoice_draft`, finalized → `invoiced`, paid → `paid`; cancelling a draft returns them to `to_invoice` when no other active invoice still references them).

#### Scenario: Create invoice from one intervention

- **WHEN** a user with invoice create permission chooses Facturer on an intervention of a case that has a billing party
- **THEN** the invoice editor opens on custom lines prefilled from that intervention’s net article usage (or empty editable lines if none) and submit creates a draft `full` invoice linked to the case and that intervention id

#### Scenario: Create invoice from several interventions of the same case

- **WHEN** the user selects several interventions of the same case and confirms creating an invoice
- **THEN** the editor prefills lines aggregated from those interventions’ net usages and submit stores all selected intervention ids on the invoice

#### Scenario: Reject interventions from another case

- **WHEN** the client sends intervention ids that do not all belong to the invoiced case (or to the organization)
- **THEN** the system MUST reject the request and MUST NOT create an invoice

#### Scenario: Quote still required for quote-sourced invoices

- **WHEN** the user requests an invoice from a quote (no custom lines)
- **THEN** the existing accepted-quote rules still apply unchanged

### Requirement: Invoice prefill includes intervention prestation usages

When an authorized user creates a customer invoice of kind `full` from one or more interventions of the same case, the prefill MUST include not only net article usages (qty > 0) but also **prestation usages** with quantity greater than zero for those interventions. Prefill lines for prestations MUST carry the catalog `prestationId`, label, unit, default unit price HT, and default TVA when available. The user MUST still be able to edit, add, or remove lines before submit. Creating the invoice MUST remain possible without an accepted quote when custom lines (including those from prestations) are provided, subject to existing billing-party rules.

#### Scenario: Prefill prestations from one intervention

- **WHEN** a user with invoice create permission chooses Facturer on an intervention that has prestation usages with quantity greater than zero
- **THEN** the invoice editor opens with custom lines that include those prestations (and any article usages) and submit creates a draft `full` invoice linked to the case

#### Scenario: Prefill aggregates articles and prestations across selection

- **WHEN** the user selects several interventions of the same case that together have article and prestation usages and creates an invoice
- **THEN** the editor prefills lines aggregated from both kinds of usages for the selected interventions

### Requirement: Invoice kinds

The system SHALL support invoice kinds `full` (facture complète), `situation` (with sequence number and percent), `deposit` (acompte), `balance` (solde), and `credit_note` (avoir). A credit note MUST reference the original invoice and reverse its amounts (or a documented partial amount). Situation invoices MUST increment situation numbering per quote. The situation percent is cumulative progress on the quote; the invoiced amount MUST be the delta since already invoiced (deposits and previous situations included). A 100 % situation MUST invoice the remaining quote amount.

#### Scenario: Situation invoice

- **WHEN** a user creates a situation invoice at 40 % cumulative progress on a quote already situation-invoiced at 20 %
- **THEN** the system records kind `situation`, the next situation number, cumulative progress 40 %, and this invoice amount equal to 20 % of the quote (40 % minus already invoiced)

#### Scenario: Credit note

- **WHEN** a user issues a credit note against a finalized local invoice
- **THEN** the system creates a `credit_note` document linked to the original invoice, with a new number in the credit-note or invoice sequence as defined for the org, and does not delete the original invoice

### Requirement: Numbering and legal document

Each organization MUST have sequential, gap-free numbering for issued (non-draft) invoices, scoped to the organization. Drafts MAY use a separate draft numbering. A finalized invoice MUST be downloadable as PDF including seller identity (including legal-identity fields when present on the snapshot), buyer identity, dates, lines, VAT, totals, invoice number, and the snapshotted regulatory mentions. Soft-delete (cancel) of **draft** invoices MUST remove them from active lists via `deletedAt` and MUST NOT allocate or free a fiscal number. Issued (finalized/paid) invoices MUST NOT be soft-deleted; cancellation of issued documents is done via credit note, preserving history and numbers.

#### Scenario: Sequential numbers

- **WHEN** two invoices are finalized in sequence for the same organization
- **THEN** their issued numbers MUST be consecutive according to the organization sequence

#### Scenario: Soft-delete draft

- **WHEN** a user cancels a draft invoice
- **THEN** the draft is soft-deleted (`deletedAt`), disappears from active lists, and the organization fiscal sequence is unchanged

#### Scenario: PDF

- **WHEN** a user downloads a finalized invoice
- **THEN** the system returns a PDF that includes number, parties, lines, VAT, totals, and the snapshotted regulatory mentions

### Requirement: Invoice PDF includes regulatory mentions

A local invoice PDF (draft or issued) MUST include the seller legal identity available on the invoice snapshot (name, SIRET, address, and when present: legal form, share capital, RCS, intra-community VAT number) and the snapshotted regulatory mention texts. Mentions MUST be rendered after the totals and before the generated-by footer. The PDF MUST still include buyer identity, dates, lines, VAT and totals as already required.

#### Scenario: PDF shows default mentions when org has no custom texts

- **WHEN** a user downloads a PDF for an invoice whose organization never customized mentions
- **THEN** the PDF includes the default French mention texts and the seller SIRET / address already required

#### Scenario: PDF shows snapshotted custom mentions

- **WHEN** a user downloads a PDF for an invoice created after the organization saved custom mention texts
- **THEN** the PDF shows those snapshotted texts even if the organization later changed its settings

#### Scenario: Issued invoice stays stable after org mention change

- **WHEN** an invoice is finalized and the organization later changes its mentions
- **THEN** re-downloading that invoice PDF MUST still show the mentions stored on the invoice, not the new organization texts

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
