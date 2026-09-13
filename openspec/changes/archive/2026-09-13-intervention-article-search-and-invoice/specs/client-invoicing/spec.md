## ADDED Requirements

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
