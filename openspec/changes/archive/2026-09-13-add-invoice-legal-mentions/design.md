## Context

See proposal.md for motivation. Local invoices live in `billing-service`; the gateway snapshots the seller from the organization at create time (`InvoiceSellerSnapshot` today: name, SIRET, email, address). PDF rendering is `billing-service/src/domain/invoice-pdf.ts` and currently has no regulatory block. Organization settings (`/organization/edit`) expose identity + address only. Mentions Planwise marketing (`apps/frontend/lib/legal/config.ts`) are unrelated and MUST NOT be reused as tenant invoice text.

## Goals / Non-Goals

**Goals:**

- Persist legal identity + mention texts on the organization (tenant-scoped).
- Ship French-law default mention strings in `@planwise/shared` so gateway, billing PDF, and UI share one source.
- Snapshot identity + resolved mentions onto each invoice at **creation** (and on PDF preview) so issued PDFs stay stable.
- Edit + restore-defaults UX on organization settings, gated by `organizations.update`.

**Non-Goals:**

- Quote PDF mentions.
- Auto-filling RCS / forme juridique / TVA from SIRET lookup (lookup today returns name + address only).
- Legal advice, per-invoice mention overrides, or e-invoicing (Factur-X / Chorus).
- Changing invoice numbering or fiscal immutability rules.

## Decisions

### 1. Structured identity + keyed mention texts

Store on the organization:

- **Identity:** `legalForm`, `shareCapital`, `rcsLabel` (ex. « RCS Brest 979 102 803 » or city + number), `vatNumber`.
- **Mentions:** keyed map `invoiceMentions: { paymentTerms, latePenalties, recoveryIndemnity, discount, vatFranchise? }`.

Rationale: identity is structured data already required by law on the invoice header; mentions are prose the artisan must be able to adapt (délai 30 jours vs 45 jours, taux de pénalité). One free-text blob would mix SIRET with pénalités and make restore-defaults clumsy.

Alternative considered: a single textarea « mentions légales ». Rejected because defaults would be harder to maintain per obligation and identity fields would be re-typed on every invoice.

### 2. Defaults live in `@planwise/shared`

Export `DEFAULT_INVOICE_MENTIONS_FR` and `resolveInvoiceMentions(orgMentions)` (empty / missing key → default). Default copy (product, not legal advice):

- **paymentTerms:** paiement à 30 jours fin de mois (modifiable).
- **latePenalties:** taux égal à 3 fois le taux d’intérêt légal, art. L441-10 C. com.
- **recoveryIndemnity:** indemnité forfaitaire de 40 € pour frais de recouvrement.
- **discount:** aucun escompte pour paiement anticipé.
- **vatFranchise:** « TVA non applicable, art. 293 B du CGI » — included in the snapshot only when the org enables / fills it (artisans en franchise).

Alternative: hard-code strings in `invoice-pdf.ts`. Rejected: UI preview and tests would drift.

### 3. Snapshot on invoice, not live org at PDF time

Extend `InvoiceSellerSnapshot` with identity fields + `mentions: Record<string, string>` (resolved texts). Gateway fills this from the current org when **creating** an invoice (and on PDF preview). There is no draft-edit API today — a draft keeps the seller snapshot from creation. Finalized invoices keep the stored snapshot; PDF reads `invoice.seller` only.

Rationale: French invoices are legal documents; changing org settings must not rewrite already issued PDFs.

Alternative: read org at render time. Rejected for issued documents.

### 4. UI on existing organization edit form

Add a `FormDialogSection` « Facturation et mentions légales » on `/organization/edit` (same `FormPage` shell, footer unchanged) and a read-only recap on `/organization`. No new route, no new permission: reuse `organizations.update`. Button « Restaurer les mentions par défaut » resets mention keys only.

Assistant: update glossary + organization journey / product-docs chunk so questions about « mentions facture » point to `/organization`.

### 5. Migration

`organizations-service` migrate-mongo: changelog schema-only (optional Mongoose fields, no data backfill; defaults apply at resolve time). If `seller.mentions` is absent on an old invoice (draft or issued), PDF render falls back to current product defaults so historical PDFs gain the missing legal block rather than stay non-compliant. Document this as a one-way improvement for pre-feature invoices (they were never legally complete).

## Risks / Trade-offs

- **[Risk] Defaults are not personalized legal advice** → Mitigation: short hint under the form: « Textes types droit français ; adaptez-les à votre activité (avocat / expert-comptable si besoin). » Product is not a law firm.
- **[Risk] Artisan leaves VAT franchise mention empty while being 293 B** → Mitigation: mention is optional and explained; we do not auto-detect franchise.
- **[Risk] Long mention texts overflow PDF** → Mitigation: dedicated block with wrapping; max length on PATCH (e.g. 800 chars per mention).
- **[Risk] Snapshot vs live confusion** → Mitigation: org page copy: « Les factures déjà émises conservent les mentions de l’époque. »

## Migration Plan

1. Deploy shared types + org migration (additive).
2. Deploy org API + UI (defaults shown even if DB empty).
3. Deploy gateway snapshot + billing PDF.
4. Rollback: additive fields; PDF can ignore unknown seller keys. Do not drop columns in the same release.

## Open Questions

- Whether SIRET lookup should later prefill NAF / legal form (out of this change).
