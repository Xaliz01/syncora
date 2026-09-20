## Context

See proposal.md (Why). Interventions are completed via Ma journée (`/my-day`) or the case detail page (`/cases/:caseId`). Today, `notes` is the only free-text field on interventions. There is no `report` or `fieldReport` field. A PDF report is generated on-demand from intervention data + photos + signature, with no AI content.

The existing `AssistantLlmClient` (OpenAI / Anthropic, env-configured) is reused for LLM calls. The addon/entitlement system (`ADDON_CODES`, `TRIAL_INCLUDED_ADDON_CODES`, `organizationHasAddon`) is the same as `team_suggestion`.

## Goals / Non-Goals

**Goals:**

- Generate a draft field report from intervention text data (title, description, notes, type, timestamps) via LLM.
- Present the draft in an editable dialog; persist only on explicit user confirmation.
- Show the confirmed report on Ma journée, the case detail page, and in the PDF report.
- Gate the feature behind `ai.field_report` permission and `ai_copilot` addon (included in trial with capped quota).
- Monthly quota counters per organization, with tier-based limits (trial/essential/copilot).

**Non-Goals:**

- Photo or voice analysis by the LLM (future enhancement within A1).
- Sending the report to the customer.
- Creating invoices or quotes from the report.
- Stock/parts extraction from the report.

## Decisions

1. **Field on InterventionDocument, not a separate collection**
   `fieldReport` (string) and `fieldReportConfirmedAt` (Date) are added directly to the intervention schema. The report is a property of the intervention, not a standalone entity. Alternative: comments collection — rejected (report is structured, not a conversation thread).

2. **LLM call in the gateway, not a dedicated microservice**
   Per roadmap: « Réutiliser le module assistant gateway. Ne pas créer un microservice dédié avant charge réelle. » The `AiFieldReportService` lives in the gateway and reuses `AssistantLlmClient`.

3. **Quota counters in subscriptions-service**
   Monthly counters (`AiQuotaCounter` collection) in subscriptions-service alongside subscription data. Atomic `findOneAndUpdate` with `$lt` check for increment. Trial uses period `"trial"` (not monthly); paid uses `"YYYY-MM"`.

4. **Entitlement check: addon + quota, server-side**
   Unlike `team_suggestion` (frontend-only gate), the AI field report is server-gated: the gateway checks `organizationHasAddon(sub, "ai_copilot")` and increments quota before calling the LLM. This prevents bypass and ensures quota accounting.

5. **`normalizeFieldReportText` in shared**
   LLM sometimes returns JSON instead of plain text. A shared function unwraps JSON/fenced responses to extract narrative text, used both in the gateway (before returning the draft) and optionally in the frontend (defense in depth).

6. **Visible on fiche dossier and in PDF**
   The field report is not just for Ma journée. It appears on the intervention section of `CaseDetailPage` and as a « Compte-rendu » section in the PDF report, between details and photos.

7. **Generate button only when no report exists**
   Once a report is confirmed, the button is replaced by the confirmed text display. Re-generation is not supported in v1 to avoid accidental overwrite. Manual editing of the confirmed text is also deferred.

8. **Permission `ai.field_report`**
   A new assignable permission code. Admins have it implicitly. The technician field default profile does NOT include it by default (the admin grants it explicitly). Both `interventions.read` (to fetch data) and `ai.field_report` (to call the LLM) are required.
