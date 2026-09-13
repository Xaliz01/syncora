## Context

See proposal.md (Why). Constraints: hexagonal Nest, `organizationId`, migrate-mongo, `@planwise/shared` contracts, FormDialog / overlay existing, user-facing copy, assistant docs if the journey changes.

Today:

- `InterventionArticlesDialog` uses a native `<select>` over the full article list.
- `SearchableSelect` already exists (`apps/frontend/components/ui/SearchableSelect.tsx`) and filters on `label`.
- Invoice create already accepts **custom lines without a quote** (`SyncCaseInvoiceOptions.lines` → kind `full`) via `CreateCaseInvoiceOverlay`, which prefills **all** case article usages (`invoiceLinesFromArticleUsages`). `canCreateCaseInvoice` still blocks when the case is `none` (only quote-accept sets `to_invoice`).
- Interventions already have `billingStatus` (default `none`) but nothing writes it on invoice create.

## Goals / Non-Goals

**Goals:**

- Reuse `SearchableSelect` for intervention article lines (search name + reference).
- Same-case multi-select + per-card Facturer, both opening the existing overlay on source « lignes » with a filtered usage set.
- Persist `interventionIds` on the invoice; upgrade intervention (and case `none`) billing status.

**Non-Goals:**

- Invoicing across several dossiers / clients.
- Computing “uninvoiced remainder” of quantities (user edits lines).
- Situation / deposit / balance from interventions (kind stays `full`).
- New permission codes.
- Article picker on Ma journée (stock usage stays on the case fiche).
- Changing quote-sourced invoice rules.

## Decisions

1. **`SearchableSelect`, not `CatalogAutocomplete`**  
   The user asked for a searchable select; intervention lines are stock articles only (no prestation, no quick-create). Extend `SearchableSelect` with `allowEmpty={false}` so the required picker does not show « Tous ». Option labels: `référence — nom`. Dropdown must remain usable inside `FormDialog` (`overflow-y-auto`): render the list in a portal (or equivalent) so it is not clipped. Alternative: `CatalogAutocomplete` — rejected (prestations + création rapide hors parcours terrain).

2. **UI only on the case fiche**  
   Each intervention card: checkbox (when `billing.invoices.create`) + **Facturer**. Section Interventions: **Créer une facture** enabled when ≥ 1 selected. Facturer on one card = select that id and open overlay. Existing case-level « Créer une facture » unchanged (quote or all usages). Default selection for bulk: interventions whose `billingStatus` is `none` or `to_invoice`; already invoiced stay selectable. Alternative: new `/interventions` list — rejected (invoice remains case-scoped).

3. **Lines still built client-side; ids are attribution**  
   Overlay receives `articleUsages` filtered to selected ids and `initialSource="lines"`. Submit sends existing `lines` plus `interventionIds`. Gateway validates ids belong to the case/org, then `createInvoice` as today. Do not re-fetch stock on the server to rebuild lines (user may have edited). Alternative: server-only line build — rejected (breaks the current editable overlay).

4. **Allow create when case is `none` if lines (or intervention ids) are provided**  
   `prepareInvoice`: if `lines` non-empty, skip `canCreateCaseInvoice` when status is `none` (still require a billing party). After persist, `recomputeCaseBillingStatus` must apply `none` → `invoice_draft`. Quote path unchanged. Alternative: force the user to set « À facturer » first — rejected (banner already says travaux terminés).

5. **`interventionIds` on the invoice document**  
   Optional `string[]` on `CreateLocalInvoiceBody` / `LocalInvoiceResponse` / Mongoose schema. migrate-mongo: field defaults to `[]` (no backfill). Gateway after successful create/finalize/paid/cancel: PATCH each referenced intervention `billingStatus` with `shouldUpgradeBillingStatus` (cancel draft: `to_invoice` if no other **active** invoice still lists that id). Same `InvoicesService` (one model). Alternative: join table — rejected for v1.

6. **Assistant / docs**  
   Update `docs/product/journeys/05-devis-facturation.md` (and aligned gateway chunks / offline FAQ if the question is likely): facturer depuis une ou plusieurs interventions du dossier.

## Risks / Trade-offs

- [Same articles billed twice if the user re-selects an already invoiced intervention] → Mitigation: default selection skips invoiced/paid; overlay remains editable; no silent qty remainder math.
- [SearchableSelect clipped in FormDialog] → Mitigation: portal the listbox; keep z-index above the dialog (`z-[100]`).
- [Case `none` + quote button still fails] → Mitigation: only the lines/intervention path bypasses `canCreateCaseInvoice`; quote path unchanged.
- [Cancel draft vs other invoices sharing an intervention] → Mitigation: only revert status if no other non-cancelled invoice still references the id.

## Migration Plan

1. migrate-mongo billing-service: add optional `interventionIds` (no index required beyond existing org/case).
2. Deploy shared types + billing-service + gateway + frontend together (UI sending unknown field is harmless only after billing accepts it).
3. Rollback: hide Facturer / checkboxes; leftover `interventionIds` arrays are ignored.

## Open Questions

None that change specs or task breakdown. Copy of the bulk button can stay « Créer une facture » to match the case action.
