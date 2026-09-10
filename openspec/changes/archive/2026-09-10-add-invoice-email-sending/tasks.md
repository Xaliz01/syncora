## 1. Shared contracts and permissions

- [x] 1.1 Add `billing.invoices.send` to `ASSIGNABLE_PERMISSION_CODES`, labels in `permissions-catalog.ts`, and default profiles that already have `billing.invoices.finalize`; verify the code is assignable and catalog-visible
- [x] 1.2 Add invoice send DTOs and `emailSends` on `LocalInvoiceResponse` in `@planwise/shared` (`to`, optional `cc`, `subject`, `body`, sender identity, send log entry); verify shared unit tests for types/helpers if any
- [x] 1.3 Extend `SendTransactionalEmailBody` with optional `attachments` (`filename`, `contentType`, `contentBase64`); verify existing notification/auth e-mail types still compile

## 2. Notifications-service (PDF attachment)

- [x] 2.1 Pass attachments through `AbstractEmailService.sendTransactionalEmail` and Nodemailer; verify `email.service.spec.ts` asserts `attachments` on `sendMail` for a PDF payload
- [x] 2.2 Accept attachments on `POST /email/transactional`; verify controller/service tests reject neither a body without attachments nor a body with one PDF

## 3. billing-service send path

- [x] 3.1 Add `emailSends` on the invoice schema (append-only array) plus migrate-mongo changelog if an index is added; verify mapper includes the log on `LocalInvoiceResponse`
- [x] 3.2 Add `SERVICE_URLS.notifications` in billing-service; verify no inline `NOTIFICATIONS_SERVICE_URL` elsewhere in the service
- [x] 3.3 Implement `sendInvoice` on `InvoicesService` (eligibility `finalized`/`paid`, validate e-mail, render PDF, call transactional e-mail with commercial footer and no CTA, append sent/failed log); verify unit tests for draft/cancelled rejection, missing recipient, success log, failed SMTP log, resend second entry
- [x] 3.4 Expose `POST /invoices/:id/send`; verify controller spec forwards organizationId, recipients, subject, body, and sender identity

## 4. Gateway

- [x] 4.1 Proxy `POST /api/billing/invoices/:id/send` with `@RequirePermissions("billing.invoices.send")`, scoped HTTP, and current user id/name; verify controller/gateway specs for permission, org scope, and 400 on draft
- [x] 4.2 Return send history on existing invoice get/list payloads; verify list/get tests still pass with `emailSends`

## 5. Frontend

- [x] 5.1 Add `sendInvoice` (and types) in `billing.api.ts`; verify the client posts to `/billing/invoices/:id/send`
- [x] 5.2 Build a shared `FormDialog` (Annuler + Envoyer) with To, optional CC, subject, message, PDF-attached hint, and send history list; verify cancel does not call the API
- [x] 5.3 Wire Envoyer on `LocalCaseInvoicesPanel` for issued invoices when the user has `billing.invoices.send`; show last-send hint for readers; verify the button is hidden without the permission
- [x] 5.4 Wire the same dialog and last-send hint on `/billing`; verify both surfaces share the dialog behaviour
- [x] 5.5 Add a Playwright journey: open send dialog, cancel (no send), then confirm send on an issued invoice; verify it lives under `apps/frontend/tests/e2e/`

## 6. Product docs and assistant

- [x] 6.1 Update `docs/product/journeys/05-devis-facturation.md` (and routes/glossary if needed) plus `product-docs.loader.ts` / offline FAQ so the assistant explains send + history; verify retrieval still hits the facturation chunk for « envoyer une facture »
