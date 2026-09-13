## ADDED Requirements

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

## MODIFIED Requirements

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
