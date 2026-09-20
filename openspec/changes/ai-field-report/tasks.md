## 1. Shared contracts

- [x] 1.1 Add `ai_copilot` to `ADDON_CODES`, `ADDON_CATALOG` (7,99 €/mois, boolean, requiresBaseSubscription), and `TRIAL_INCLUDED_ADDON_CODES`; verify `organizationHasAddon` returns true for trialing orgs
- [x] 1.2 Add AI quota types (`AiUsageKey`, `AiQuotaTier`, `AI_QUOTA_LIMITS`, `AiQuotaStatusResponse`) and field report DTOs (`GenerateFieldReportBody/Response`, `ConfirmFieldReportBody/Response`) in `@planwise/shared`
- [x] 1.3 Add `ai.field_report` to `ASSIGNABLE_PERMISSION_CODES`; add label in `permissions-catalog.ts`
- [x] 1.4 Add `fieldReport` and `fieldReportConfirmedAt` to `InterventionResponse`
- [x] 1.5 Add `normalizeFieldReportText` to clean JSON/fenced LLM responses into plain text

## 2. Cases-service

- [x] 2.1 Add `fieldReport` (string) and `fieldReportConfirmedAt` (Date) to `InterventionDocument` schema; update mapper to include them in response
- [x] 2.2 Add `confirmFieldReport(id, organizationId, report)` to `InterventionsService` and port; add `POST /interventions/:id/field-report` endpoint
- [x] 2.3 Migration `20260920100000-intervention-field-report.js` (schema-only, no data change)

## 3. Subscriptions-service

- [x] 3.1 Add `AiQuotaCounter` schema (organizationId, usage, period, count) with unique compound index; register in app module
- [x] 3.2 Add `AiQuotaService` with `incrementIfAllowed` (atomic check+increment) and `getQuotaStatus`
- [x] 3.3 Add `AiQuotaController` with `GET /ai-quota/status` and `POST /ai-quota/increment`

## 4. API Gateway

- [x] 4.1 Add `AiFieldReportService` orchestrating: permission check → subscription/addon check → quota increment → LLM call → return draft; reuse `AssistantLlmClient`
- [x] 4.2 Add `AiFieldReportController` with `POST /ai/field-report/generate`, `POST /ai/field-report/confirm`, `GET /ai/field-report/quota`; guards `JwtAuthGuard` + `RequirePermissionGuard`
- [x] 4.3 Register `AiFieldReportModule` in `app.module.ts`
- [x] 4.4 Include `fieldReport` in the PDF report (« Compte-rendu » section before photos)

## 5. Frontend

- [x] 5.1 Add `ai-field-report.api.ts` with `generateFieldReport`, `confirmFieldReport`, `getFieldReportQuota`
- [x] 5.2 Add `FieldReportDialog` component: loading spinner → editable textarea → confirm/cancel footer
- [x] 5.3 Add « Préremplir le compte-rendu » button on completed interventions in `MyDayPage` (gated by `ai.field_report` permission); show confirmed report inline
- [x] 5.4 Add field report display and generate button on `CaseDetailPage` intervention section (same gate)

## 6. Tests

- [x] 6.1 Unit tests for `ai-quota.ts` types and `ai-copilot-addon` entitlement (shared)
- [x] 6.2 Unit tests for `AiFieldReportController` (gateway): input validation, delegation
- [x] 6.3 Unit test for `normalizeFieldReportText` (shared)
- [x] 6.4 Unit test for intervention mapper including `fieldReport` fields
