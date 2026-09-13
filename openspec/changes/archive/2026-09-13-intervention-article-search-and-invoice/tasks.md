## 1. Shared contracts

- [x] 1.1 Add optional `interventionIds: string[]` on `SyncCaseInvoiceOptions`, `CreateLocalInvoiceBody`, and `LocalInvoiceResponse` in `@planwise/shared`; verify types compile and existing invoice helpers still pass
- [x] 1.2 Allow invoice create from custom lines when case `billingStatus` is `none` (keep quote path gated by `canCreateCaseInvoice`); verify a shared or gateway unit test covers both paths

## 2. Persistence and gateway

- [x] 2.1 Persist `interventionIds` on the billing-service invoice schema + mapper, with a migrate-mongo changelog (default `[]`); verify create/get returns the ids
- [x] 2.2 Validate in `BillingGatewayService.prepareInvoice` / `createInvoice` that provided intervention ids all belong to the case and org; verify unit tests reject foreign ids and accept a same-case list with custom lines (no quote)
- [x] 2.3 After invoice create / finalize / paid / cancel-draft, update referenced interventions’ `billingStatus` (`invoice_draft` / `invoiced` / `paid` / `to_invoice` if no other active invoice lists them) and recompute case status from `none`; verify gateway (or cases) unit tests for upgrade and cancel revert

## 3. Searchable article picker

- [x] 3.1 Extend `SearchableSelect` with `allowEmpty={false}` and a portaled listbox usable inside `FormDialog`; verify empty « Tous » is hidden when `allowEmpty` is false and the list is not clipped
- [x] 3.2 Replace the native article `<select>` in `InterventionArticlesDialog` with `SearchableSelect` (label `référence — nom`, filter remaining articles); verify the dialog still saves usage as today

## 4. Invoice from interventions (UI)

- [x] 4.1 On the case fiche, add per-intervention checkbox + **Facturer**, and a section action **Créer une facture** for the current selection; verify the actions are hidden without `billing.invoices.create`
- [x] 4.2 Open `CreateCaseInvoiceOverlay` on source lines with usages limited to the selected intervention(s) and pass `interventionIds` on submit; verify one-card Facturer and multi-select both prefill the right lines
- [x] 4.3 Default-select interventions in `none` / `to_invoice`; verify already invoiced interventions remain manually selectable

## 5. Tests, docs, assistant

- [x] 5.1 Add a Playwright journey: searchable article pick on an intervention, then create an invoice from one intervention and from two selected interventions; verify it lives under `apps/frontend/tests/e2e/`
- [x] 5.2 Update `docs/product/journeys/05-devis-facturation.md` and aligned assistant chunks / offline FAQ; verify a question like « facturer une intervention » retrieves the new guidance
