## Context

See proposal.md (Why). Local invoices already live in `billing-service` (lifecycle, PDF, case panel, `/billing`). Transactional e-mail already exists in `notifications-service` (`POST /email/transactional`, Nodemailer SMTP) but accepts only `to` / `subject` / `body` / CTA — **no attachments**. Quote « Envoyer » is a status change, not mail. Constraints: hexagonal Nest, one Mongoose model = one domain service, `SERVICE_URLS`, `organizationId`, migrate-mongo, permissions in shared + catalog + gateway + UI, `FormDialog` for confirmation, user-facing copy (no SMTP/localhost details), assistant/docs if the journey changes.

## Goals / Non-Goals

**Goals:**

- Orchestrate send in `billing-service` (load invoice, generate PDF, call notifications-service, append send log).
- Extend transactional mail with a single PDF attachment without changing notification-preference e-mails.
- Surface send + history on the case invoice panel and `/billing`.

**Non-Goals:**

- Auto-send on finalize, scheduled payment reminders, or quote e-mail.
- A separate `invoice_sends` collection / service (same Invoice document).
- HTML e-mail preview beyond the confirmation fields.
- Changing the existing local-env recipient allowlist in notifications-service.

## Decisions

1. **Orchestration in billing-service, not the gateway**  
   The invoice and its PDF already belong to billing-service. Gateway authenticates, injects `organizationId` + sender identity (`userId`, display name), and proxies `POST /billing/invoices/:id/send`. Alternative: gateway generates PDF then calls notifications-service — rejected (duplicates PDF path, send log would still need billing-service).

2. **Send log as subdocuments on the invoice**  
   Append-only array `emailSends[]` on `invoices` (timestamp, to, cc, sentByUserId, sentByName, status `sent` | `failed`, reason). Same model → stay on `InvoicesService` (hexagonal rule). Alternative: `invoice_sends` collection — extra service for a child ledger; rejected for v1. Never `$pull` entries (trace / ledger).

3. **Permission `billing.invoices.send`**  
   Distinct from `billing.invoices.read` / `create` / `finalize`. Add to assignable codes, frontend catalog, default admin (and the same operational profiles that already have `finalize`). Gateway `@RequirePermissions`. UI: hide Envoyer without the code; history remains visible with `read`. Alternative: reuse `create` — rejected (sending is not creating).

4. **Transactional API grows attachments**  
   Add optional `attachments: { filename, contentType, contentBase64 }[]` on `SendTransactionalEmailBody`. Notifications-service maps them to Nodemailer `attachments`. Limit: one PDF, size consistent with existing invoice PDFs. Do not use `POST /email/send` (that resolves an in-app user id). Footer: commercial document from the org, not account-security copy. No Planwise CTA (recipient is the client, not a user).

5. **Eligibility**  
   Sendable when `status` is `finalized` or `paid` (covers credit notes once issued). Draft / cancelled → 400. Resend allowed. Primary `to` required (valid e-mail); optional `cc` list. Prefill `customer.email`. Subject/body defaults (number, org, amount) editable in the dialog.

6. **Confirmation UI**  
   Shared `FormDialog` (footer Annuler + Envoyer à droite) opened from `LocalCaseInvoicesPanel` and `/billing`. Fields: To, optional CC, subject, message, hint « Le PDF de la facture sera joint. ». Submit calls the API; cancel is a no-op. History: last-send hint on the card/row; full list in the same dialog or an expandable block (implementation choice, both surfaces required).

7. **Failed SMTP still logged**  
   If notifications-service returns `sent: false` (SMTP down, local allowlist, provider error), persist a `failed` entry and return a user-facing error. Do not mention env, host, or allowlist in the UI.

8. **billing-service `SERVICE_URLS`**  
   Add `notifications` next to existing `cases`. Do not inline `process.env.NOTIFICATIONS_SERVICE_URL`.

## Risks / Trade-offs

- [PDF + base64 over HTTP between services] → Mitigation: one attachment, existing PDF size; 60s timeout on this gateway/billing call if needed (search stays 10s).
- [Local allowlist blocks real client addresses in dev] → Mitigation: keep current notifications-service rule; failed log + generic UI error; testers use the allowed address.
- [PII in send log (e-mail addresses)] → Mitigation: org-scoped like the invoice; no extra collection to leak; same retention as invoices.
- [User confirms then SMTP fails] → Mitigation: failed history entry so the attempt is visible; user can resend.

## Migration Plan

1. migrate-mongo on billing-service: no required backfill (`emailSends` defaults to `[]`); optional no-op index comment if none added.
2. Deploy notifications-service (attachments) before or with billing-service send path.
3. Ship gateway + UI in the same release so the button is not 404.
4. Rollback: hide UI + route; existing `emailSends` arrays remain harmless.

## Open Questions

- Exact default subject/body wording can follow in-app copy conventions at implement time without changing requirements.
