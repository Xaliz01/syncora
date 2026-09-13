## Context

See proposal.md (Why). `/platform/prospection` already lists **prospects suivis** (filtre statut / recherche, pagination 50) and sends one outreach via `POST /platform/prospects/outreach` (`templateId`, `toEmail`, `force` if déjà `sent`). Templates `prospect_outreach` are chosen in the page header. Placeholders (`{{greeting}}`, `{{companyName}}`, …) are interpolated per recipient. Staff JWT only — not org-scoped.

## Goals / Non-Goals

**Goals:**

- Multi-select on the **tracked** table (page + résultat filtré borné), then one confirmed bulk send.
- Reuse the existing single-send path (template load, SMTP, journal `prospect-outreaches`) so a bulk send is N unit sends with a roll-up.
- Cap volume and continue the lot after individual failures.
- Append-only send history per prospect (which template / subject, when, to whom, sent or failed), for unit and bulk sends.

**Non-Goals:**

- Bulk from Pappers search results.
- Async job / cron / `cron_runs` (request stays in the HTTP call).
- New Mongo collection or users-service batch API.
- Per-recipient template override.
- Storing the full HTML body in history (template name + interpolated subject are enough).

## Decisions

1. **Gateway batch, sequential unit send**  
   `POST /platform/prospects/outreach/bulk` accepts `{ templateId, recipients: [{ siren, companyName, toEmail, contactName? }] }` and calls the existing `sendProspectOutreach` with `force: true` for each valid recipient (explicit staff selection, including already contacted). Sequential to protect SMTP. Alternative: N parallel frontend calls — rejected (partial UI state, no shared cap, no single confirm). Alternative: queue — rejected for v1 volume (≤ 200).

2. **Hard cap 200 recipients**  
   Aligns with `MAX_PAGE_LIMIT`. Over-cap → 400, nothing sent. UI: « sélectionner les N filtrés » only if `trackedTotal ≤ 200` (fetch remaining pages with `fetchAllPaginated`); otherwise ask to refine filters.

3. **Client sends the explicit recipient list**  
   Selection (page checkboxes + optional load-all-filtered) lives in the UI. The API does not re-apply list filters. Alternative: `{ status: "sent", excludeSirens }` — rejected (hidden query, risk of sending to people not shown).

4. **Skip invalid e-mails, do not abort**  
   Missing / invalid `toEmail` → item `skipped` in the response, no SMTP. Duplicate SIREN in the payload → 400. Invalid SIREN / empty `templateId` / empty recipients after skip-all-invalid: if zero valid recipients, 400 before any send. Mixed valid+invalid: send valid, report skipped.

5. **Confirmation UI**  
   Sticky action bar when `selectedCount > 0`: count, template select (same catalog as header), primary **Envoyer la sélection**. `FormDialog` (Annuler + Envoyer à droite): template name, count to send, count skipped for missing e-mail, mention that already-contacted will be resent. Progress: disable controls; after response, toast + short bilan (envoyés / échecs / ignorés), clear selection, reload tracked list.

6. **Select all on page vs filtered set**  
   Header checkbox = current page. Separate action « Sélectionner les N (filtrés) » when `total > page length` and `total ≤ 200`. Changing filter / page does not silently keep off-page ids unless they were loaded via that action; document in UI that selection follows the loaded rows. Practical rule: selection is a `Set` of SIRENs among **loaded** tracked rows; load-all-filtered appends to loaded state then selects all.

7. **No new permission**  
   Same `PlatformJwtAuthGuard` as single send. Platform staff only.

8. **Append-only `emailSends` on the same prospect document**  
   One document per SIREN stays (comment, latest status). Each successful or failed **mail** attempt `$push`es `{ sentAt, subject, templateId, templateName, toEmail, sentByUserId, sentByEmail, status: "sent" | "failed" }`. Top-level `subject` / `sentAt` remain the **latest** send for list sort. `email_not_found` / `noted` MUST NOT append a send entry. Never `$pull` history (trace / ledger). Alternative: new collection — rejected (hexagonal 1 model = 1 service; same pattern as invoice `emailSends`). Gateway passes `templateId` + template `name` into `CreateProspectOutreachBody`.

9. **History UI on the tracked row**  
   Show last send (subject or template name + date). Action **Historique** opens a `FormDialog` (Fermer à droite) listing newest first. Empty history for never-mailed prospects (`noted` / `email_not_found` only).

## Risks / Trade-offs

- [HTTP timeout on large sequential SMTP] → Mitigation: cap 200; gateway timeout ≥ 60s on this route; UI progress copy « Envoi en cours… ».
- [Staff selects 200 by mistake] → Mitigation: confirm dialog with exact count + template name.
- [First toast / second action races] → Mitigation: disable bulk while in flight; bilan in the dialog or a single summary toast.
- [SMTP rate limits] → Mitigation: sequential send; failed items stay in the bilan for retry (reselect failed).
- [Existing docs lose prior sends already overwritten] → Mitigation: migrate-mongo backfills **one** entry from current `subject` / `sentAt` / `email` / staff fields when status is `sent` or `failed`; older overwritten sends cannot be recovered.
- [History grows unbounded] → Mitigation: accept for v1 (low volume staff tool); do not prune.

## Migration Plan

1. users-service migrate-mongo: ensure `emailSends` array; backfill one entry for `sent` / `failed` docs that have none.
2. Deploy users-service (schema + append) before or with gateway/UI that read `emailSends`.
3. Ship gateway bulk + UI in the same release.
4. Rollback: hide bulk UI + route; `emailSends` remains harmless if the mapper still ignores unknown fields.

## Open Questions

- Exact wording of the confirmation and bilan can follow in-app copy conventions at implement time.
