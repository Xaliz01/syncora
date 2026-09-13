## Context

See proposal.md (Why). Constraints: hexagonal Nest (`stock-service`), `organizationId`, migrate-mongo, `@planwise/shared`, FormDialog patterns, user-facing copy, assistant docs when the journey changes.

Today:

- Intervention « articles utilisés » persist only via **stock movements** keyed by `articleId` (`ArticleStockService.addInterventionArticleUsage` / `getInterventionUsage`).
- Prestations are a separate catalog (`PrestationService`) with no stock tracking; quotes and invoice free lines already support `prestationId` via `CommercialLinesEditor` / `CatalogAutocomplete`.
- Invoice-from-intervention (sibling change) prefills via `collectArticleUsagesForInvoice` + `invoiceLinesFromArticleUsages` — articles only.
- Permissions already exist: `stock.interventions.read|create`, `prestations.read`.

## Goals / Non-Goals

**Goals:**

- Persist prestation consumption on an intervention without stock movements.
- Mixed searchable picker in the intervention usage dialog (articles + prestations).
- Prefill intervention invoices with prestation lines using catalog price/TVA.

**Non-Goals:**

- Stock levels / locations for prestations.
- Quick-create of articles or prestations from the intervention dialog.
- Changing quote rules or invoice kinds beyond prefill of `full` custom lines.
- New permission codes.
- Uninvoiced quantity remainder math (user still edits overlay lines).
- Ma journée article/prestation picker (usage stays on the case fiche).

## Decisions

1. **Separate usage model, not stock movements**  
   Add an `intervention_prestation_usages` (name TBD) Mongoose model + dedicated domain service/port in `stock-service` (1 model = 1 service). Fields: `organizationId`, `interventionId`, `caseId?`, `prestationId`, `quantity`, soft-delete `deletedAt`, timestamps. Upsert-by-(org, intervention, prestation) or replace-set from dialog save — prefer **replace net quantity per prestation** (set qty; qty 0 / remove = soft-delete or delete from active list). Alternative: embed on intervention in cases-service — rejected (usage already lives in stock-service for articles; keep one place). Alternative: overload stock_movements with null articleId — rejected (prestations are not stock).

2. **API shape**
   - `GET …/interventions/:id/usages` (or keep article GET and add `GET/PUT …/interventions/:id/prestations`) returning prestation usages alongside existing article list used by the UI. Prefer extending the **frontend load** to call article usage + new prestation usage endpoints rather than a breaking rename of the article GET.
   - Write: `PUT` replace-all or per-line POST/PATCH consistent with how the dialog already diffs article movements — for prestations, **set absolute quantity** (simpler than in/out), gated by `stock.interventions.create`. List/read gated by `stock.interventions.read`. Listing catalog for the picker needs `prestations.read` (hide prestation options if missing).
   - Gateway: `OrganizationScopedHttpClient` + existing permission decorators on stock routes.

3. **UI: mixed picker without quick-create**  
   Extend `InterventionArticlesDialog` (rename label to « Articles et prestations » or « Consommations » — user-facing) to load prestations when `prestations.read`. Use a searchable mixed list: either `CatalogAutocomplete` with create disabled / create affordance hidden, or `SearchableSelect` options tagged `article` | `prestation` (label `référence — nom`, optional kind hint). Prefer **extending the current SearchableSelect approach** already used for articles (portal, `allowEmpty={false}`) with a `kind` on options to avoid bringing prestation quick-create into the field dialog. Article lines keep location; prestation lines hide location.

4. **Invoice prefill**  
   Collect prestation usages for selected intervention ids; add `invoiceLinesFromPrestationUsages` (or unify with articles) in `@planwise/shared` using `defaultPrice` / `defaultTvaRate`. Merge into overlay `articleUsages` path as a combined commercial usage list or pass a second array into `CreateCaseInvoiceOverlay`. Submit still sends `lines` + `interventionIds` — no server rebuild. Overlay already accepts `prestationId` on free lines.

5. **Docs / assistant**  
   Update `docs/product/journeys/05-devis-facturation.md` (and aligned chunks / offline FAQ): on an intervention one can record articles and prestations; Facturer prefills both.

## Risks / Trade-offs

- [Sibling change still in flight for searchable articles + intervention invoice] → Implement against current branch APIs; keep tasks ordered so article path remains intact.
- [Duplicate catalog ids across article vs prestation] → Options carry an explicit `kind`; never key a mixed map by id alone.
- [User without `prestations.read`] → Show articles only; do not fail the dialog.
- [Orphan usages if prestation soft-deleted] → Keep line readable with degraded label; block new selection of inactive prestations.

## Migration Plan

1. migrate-mongo in stock-service: create collection + indexes (`organizationId+interventionId+prestationId` unique among active, org filter).
2. Deploy shared + stock-service + gateway + frontend together.
3. Rollback: hide prestation options in UI; leftover usage docs ignored by old clients.

## Open Questions

None that change specs or task breakdown. Exact HTTP path names (`/prestations` under intervention vs `/usages`) left to implementer consistency with existing stock controller style.
