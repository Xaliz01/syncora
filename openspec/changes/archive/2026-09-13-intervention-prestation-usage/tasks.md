## 1. Shared contracts

- [x] 1.1 Add intervention prestation usage DTOs in `@planwise/shared` (`InterventionPrestationUsageResponse`, set/replace body with `prestationId` + quantity) and export them; verify types compile and existing stock/prestation tests still pass
- [x] 1.2 Add `invoiceLinesFromPrestationUsages` (or extend the article helper) to build `SyncCaseInvoiceLineInput` with `prestationId`, catalog price and TVA; verify a shared unit test covers qty > 0 merge and skips zero qty

## 2. Stock-service persistence and API

- [x] 2.1 Add Mongoose schema + migrate-mongo changelog for intervention prestation usages (`organizationId`, `interventionId`, `prestationId`, `quantity`, soft-delete, unique active index); verify `migrate:status` / up is idempotent for the new field/collection
- [x] 2.2 Implement dedicated domain service + port + mapper (list by intervention, set/replace quantities, validate prestation belongs to org, no stock movements); verify unit tests for add/update, foreign prestation rejection, and no movement writes
- [x] 2.3 Expose HTTP routes on stock-service and gateway proxy with `stock.interventions.read|create` (+ org scope); verify controller/gateway specs forward organizationId and permissions

## 3. Intervention usage UI

- [x] 3.1 Extend `InterventionArticlesDialog` to load prestations when `prestations.read`, offer a mixed searchable picker (`kind` article|prestation, `allowEmpty={false}`, portal), and hide stock location on prestation lines; verify choosing a prestation does not show location and duplicate ids of the same kind stay excluded
- [x] 3.2 Persist prestation lines on save (absolute qty; remove clears usage) alongside existing article movement diffs; verify the dialog reloads article + prestation usages after save

## 4. Invoice prefill from interventions

- [x] 4.1 Aggregate prestation usages for selected intervention ids on the case fiche and merge into `CreateCaseInvoiceOverlay` prefill with article lines; verify Facturer on one intervention and multi-select both include prestation lines with `prestationId`
- [x] 4.2 Keep submit path sending editable `lines` + `interventionIds` without server rebuild; verify existing intervention invoice gateway tests still pass

## 5. Tests, docs, assistant

- [x] 5.1 Extend or add a Playwright journey: add a prestation on an intervention, then create an invoice from that intervention and assert a prefilled prestation line; verify it lives under `apps/frontend/tests/e2e/`
- [x] 5.2 Update `docs/product/journeys/05-devis-facturation.md` and aligned assistant chunks / offline FAQ; verify a question like « prestation sur une intervention » retrieves the new guidance
