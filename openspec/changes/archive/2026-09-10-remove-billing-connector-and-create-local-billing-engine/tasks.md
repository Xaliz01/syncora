## 1. Shared contracts and permissions

- [x] 1.1 Add local invoice DTOs in `@planwise/shared` (kinds including `credit_note`, statuses, sequences, pagination) and extend line builders if needed; verify unit tests in `packages/shared/src/__tests__/`
- [x] 1.2 Add assignable permission codes (`billing.invoices.read|create|finalize` or equivalent), labels in `permissions-catalog.ts`, and default profiles; verify `ASSIGNABLE_PERMISSION_CODES` includes them
- [x] 1.3 Mark `integrations.invoice-sync` as disabled in `PLATFORM_CRON_JOBS` (label/schedule/description) without removing historical `cron_runs`; verify catalogue text on `/platform/crons` would show disabled

## 2. billing-service

- [x] 2.1 Scaffold `services/billing-service` (hexagonal Nest, migrate-mongo, `SERVICE_URLS`, health, Docker `SERVICE=` arg) mirroring cases/stock; verify the service boots against Mongo and `migrate:status` works
- [x] 2.2 Persist invoices + sequences with `organizationId`, soft-delete rules for issued docs, and org-scoped list/get; verify service unit tests and `assertOrganizationScoped*`
- [x] 2.3 Implement create-from-quote / custom lines, kinds `full|situation|deposit|balance|credit_note` (avoir linked to original, series prefix `A-` or equivalent); verify unit tests for numbering gaps and situation increment
- [x] 2.4 Implement draft → finalize → paid/cancel and PDF generation/storage following existing document/S3 patterns; verify PDF download test and finalize numbering test
- [x] 2.5 HTTP API internal (create, list, get, finalize, credit, pdf) used only by gateway; verify controller tests

## 3. Gateway and case status

- [x] 3.1 Add `SERVICE_URLS.billing` and gateway port/service using `OrganizationScopedHttpClient`; verify typed calls and org injection
- [x] 3.2 Move quote/party prepare from provider sync to local invoice create; PATCH case `billingStatus` after mutations; verify `integrations-billing-party` / new billing specs
- [x] 3.3 Disable or 410 public provider connect/sync routes used by the app; verify they are not callable for invoicing and existing tests updated

## 4. Disable connectors and cron

- [x] 4.1 Stop `invoice-sync.scheduler` from running (no `@Cron` or guarded no-op); verify scheduler tests that the job does not refresh remotes
- [x] 4.2 Hide Pennylane/Qonto/demo sections and case CTAs; keep adapter source; verify settings/integrations and case invoice UI have no provider send actions

## 5. Frontend local billing

- [x] 5.1 Invoice create overlay/page from quote with kinds + avoir, wired to gateway billing API; verify Playwright journey (quote → invoice) in `apps/frontend/tests/e2e/`
- [x] 5.2 `/billing` lists local invoices (filters, pagination `ListPagination`); verify list loads and respects permissions
- [x] 5.3 User-facing banner on billing + create flow: e-invoicing **emission** coming soon; no Qonto/Pennylane; no claim of reception/PDP; verify copy in UI

## 6. Product docs, assistant, deploy

- [x] 6.1 Update `docs/product/journeys/05-devis-facturation.md`, `06-integrations.md`, glossary/routes, `ASSISTANT_ROUTE_CATALOG`, `product-docs.loader.ts`, offline FAQ as needed; verify assistant retrieval tests if behaviour changes
- [x] 6.2 Add billing-service to `docker-compose` prod/local, CD matrix, env example, gateway URL; verify compose file references the image

## 7. Regression

- [x] 7.1 Adjust E2E `pennylane.spec.ts` / `qonto.spec.ts` / `billing.spec.ts` so they no longer require live connectors; verify `npm run test` for touched workspaces and the new Playwright journey
