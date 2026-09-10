## Context

See proposal.md (Why). Today client invoices are `BillingProviderAdapter` implementations in `integrations-service` (Pennylane, Qonto, demo), prepared by the API gateway from quotes, with `integration_syncs` as traces and `integrations.invoice-sync` every 10 minutes. Quote kinds `full` / `situation` / `deposit` / `balance` already exist in `@planwise/shared`; there is no `credit_note`. Product rule until now: Planwise does not issue legal invoices. This change inverts that for **classic** invoices in a dedicated service. Constraints: hexagonal Nest, migrate-mongo, `organizationId`, `SERVICE_URLS`, pagination `limit`/`offset`/`total`, permissions in shared + catalog + gateway + UI, assistant/product docs, no public Qonto/Pennylane naming on marketing (already done) and now in-app connector UI.

## Goals / Non-Goals

**Goals:**

- Isolate local invoicing in `billing-service` (one model family = invoices + sequences + credit notes).
- Reuse quote line builders and case `billingStatus` aggregation with a local source of truth.
- Feature-flag or hard-disable provider UI and the invoice-sync scheduler without deleting adapter code.
- Deploy as a new Compose/CD image like other microservices.

**Non-Goals:**

- Implementing PDP / Chorus / Factur-X / incoming e-invoice reception.
- Deleting Pennylane/Qonto adapters or historical sync documents.
- Changing Planwise subscription (Stripe) billing.

## Decisions

1. **New `billing-service` rather than stuffing invoices into integrations-service**  
   Integrations remain connector-shaped; legal numbering, PDF and avoirs are a different bounded context. Alternative considered: extend demo adapter into “real” local billing — rejected because demo is trial-only, XOR with providers, and not numbered as a fiscal series.

2. **Keep adapter code, disable at the edges**  
   Hide frontend sections and case CTAs; gateway routes for provider sync return a stable 410/403 with a generic message (not vendor-specific if we can avoid it); `@Cron` for invoice-sync not registered (or no-op + catalogue `disabled`). Alternative: delete adapters — rejected (faster to re-enable if needed; ledger kept).

3. **Invoice document model**  
   Mongo `invoices` (header, lines, kind, status, quoteId, caseId, party snapshot, numbers, PDF storage ref) + `invoice_sequences` (org + series). Credit notes are invoices with `kind: credit_note` and `creditedInvoiceId`. Alternative: separate `credit_notes` collection — extra hexagonal services for little gain.

4. **PDF**  
   Generate in billing-service (or documents-service if PDF pipeline already fits). Prefer storing bytes via existing `STORAGE_PROVIDER` (S3/local) with a documents metadata row if that is how quotes/PDFs work; otherwise billing-service owns a PDF blob keyed by invoice id. Decision at implement: follow the quote PDF path in cases/documents if one exists; do not invent a second S3 client pattern.

5. **Permissions**  
   New codes e.g. `billing.invoices.read`, `billing.invoices.create`, `billing.invoices.finalize` (and credit). Map `/billing` to these rather than only `exports.billing`. Keep `cases.manage_billing` for CRM status if still used. Do not reuse `integrations.*.sync` for local create.

6. **Gateway**  
   `OrganizationScopedHttpClient` → `SERVICE_URLS.billing`. Prepare quote/party remains on gateway (same as `prepareInvoiceSync`) then POST billing-service. Case `billingStatus` PATCH stays on cases-service, triggered after invoice mutations (gateway or billing-service via cases URL in `SERVICE_URLS`).

7. **E-invoicing copy**  
   Static product notice (docs + UI banner), no feature flag required for v1. Future connector is a later change.

8. **Cron catalogue**  
   Keep `integrations.invoice-sync` in `PLATFORM_CRON_JOBS` as disabled/skipped so backoffice history remains understandable, or mark schedule “Désactivé”. Do not leave a live `@Cron`.

## Risks / Trade-offs

- [Legal quality of PDFs] → Mitigation: include required French mentions we already have on org profile (SIRET, address, VAT); legal review later, not a PDP.
- [Users with live Qonto/Pennylane invoices] → Mitigation: traces stay; no more refresh; banner to use Planwise invoices going forward; support via Crisp.
- [Gap in numbering if we allow deletes] → Mitigation: issued numbers never recycled; drafts excluded from fiscal sequence.
- [Dual write case status vs invoices] → Mitigation: single aggregation function from local invoices (and optionally frozen sync traces) in one place (gateway or billing-service).
- [Demo trial orgs] → Mitigation: they use local billing like everyone; demo section gone.

## Migration Plan

1. Deploy `billing-service` empty; run migrations.
2. Ship UI that hides connectors and enables local invoice create (feature together so users are never without a path).
3. Disable scheduler in the same release.
4. Rollback: re-enable scheduler + UI sections via revert; local invoices remain in Mongo (harmless).

## Open Questions

- Exact fiscal series (one sequence vs separate avoir series) can follow French common practice (separate `A-` prefix) at implementation without changing specs.
- Whether `/settings/integrations` page is emptied vs removed from nav if nothing else remains on that screen.
