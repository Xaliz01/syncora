## 1. Shared contracts

- [x] 1.1 Add `PlatformProspectBulkOutreachBody` (`templateId`, `recipients[]` with `siren`, `companyName`, `toEmail`, optional `contactName`) and `PlatformProspectBulkOutreachResponse` (`sent` / `failed` / `skipped` counts + per-recipient results) in `@planwise/shared`; verify types compile and existing single-send DTOs stay unchanged
- [x] 1.2 Export a shared max batch size aligned with `MAX_PAGE_LIMIT` (200) if useful for gateway + UI; verify the constant is imported rather than duplicated as a magic number
- [x] 1.3 Add `ProspectOutreachEmailSend` (`sentAt`, `subject`, `templateId`, `templateName`, `toEmail`, `sentByUserId`, `sentByEmail`, `status: sent | failed`) and `emailSends` on `ProspectOutreachResponse` / `CreateProspectOutreachBody`; verify list responses can include an empty or populated history

## 2. Users-service history

- [x] 2.1 Add `emailSends` on the prospect outreach schema (append-only) and mapper; on create with status `sent` or `failed`, `$push` a send entry and keep top-level `subject` / `sentAt` as the latest; verify unit tests that a second send keeps the first entry
- [x] 2.2 migrate-mongo: default `emailSends` to `[]` and backfill one entry from current fields when status is `sent` or `failed` and the array is empty; verify `down` is coherent and `noted` / `email_not_found` are not backfilled as sends
- [x] 2.3 Do not append a send entry for `noted` or `email_not_found`; verify comment / email-not-found upserts leave `emailSends` unchanged

## 3. Gateway bulk send

- [x] 3.1 Implement `sendProspectOutreachBulk` on the platform prospects port/service: reject empty `templateId`, duplicate SIREN, or more than 200 recipients (nothing sent); skip invalid e-mails; sequentially call existing `sendProspectOutreach` with `force: true` for valid rows; verify unit tests for cap, duplicates, skip-only, mixed skip+send, and one SMTP failure that does not stop the rest
- [x] 3.2 Expose `POST /platform/prospects/outreach/bulk` behind `PlatformJwtAuthGuard` and return the bilan; verify controller/spec forwards staff identity and does not require org permissions
- [x] 3.3 Use a request timeout suitable for sequential SMTP (about 60s) on this route only; verify the unit send route timeout is unchanged
- [x] 3.4 Pass `templateId` and template name through the existing unit-send journal call so history can store content identity; verify a single-send test persists those fields on the new `emailSends` entry

## 4. Frontend selection, send, and history

- [x] 4.1 Add `sendPlatformProspectOutreachBulk` in `platform.api.ts`; verify it posts the new body to `/platform/prospects/outreach/bulk`
- [x] 4.2 On the tracked table, add row checkboxes, a header « page courante », and « Sélectionner les N (filtrés) » when `1 < total ≤ 200` and total exceeds the current page (load remaining pages then select); hide one-click full-filter select when `total > 200` with a refine-filters hint; verify unchecking a row updates the count
- [x] 4.3 When the selection is non-empty, show an action bar: count, template (same `prospect_outreach` catalog), **Envoyer la sélection**; open a `FormDialog` (Annuler + Envoyer) with template name, send count, skipped-without-email count, and resend mention for already-contacted; verify cancel does not call the API
- [x] 4.4 On confirm, disable controls, call bulk send, show a user-facing bilan (envoyés / échecs / ignorés), clear selection, and reload tracked; verify a mixed mock response updates the list and does not leave a stuck « Envoi… »
- [x] 4.5 On each tracked row, show the last send (content + date) and a **Historique** action opening a `FormDialog` (newest first: content, date, destination, sent/failed); empty copy when never mailed; verify a prospect with two `emailSends` shows both after a resend

## 5. Tests

- [x] 5.1 Add a mocked Playwright journey on `/platform/prospection` (staff token): filter or list tracked, select / uncheck, cancel confirm, then confirm bulk send and assert the bulk body (SIRENs + `templateId`); open history and assert a prior send is still listed after the new one; verify it lives under `apps/frontend/tests/e2e/`
