"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  COPILOT_ACTION_LABELS,
  type CopilotActionEdit,
  type CopilotProposedAction,
  type CopilotSessionResponse,
  type TvaRate,
} from "@planwise/shared";
import { TVA_RATES } from "@planwise/shared";
import {
  FormDialog,
  FormDialogCancelButton,
  FormDialogPrimaryButton,
  formFieldHintClassName,
  formFieldInputClassName,
  formFieldLabelClassName,
} from "@/components/ui/FormDialog";
import { decideCopilotSession } from "@/lib/ai-copilot.api";

function toLocalInput(iso?: string): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function fromLocalInput(value: string): string | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toISOString();
}

function safeHref(href?: string): string | undefined {
  if (!href || !href.startsWith("/") || href.startsWith("//")) return undefined;
  return href;
}

export function CopilotReviewDialog({
  session,
  onClose,
  onDecided,
}: {
  session: CopilotSessionResponse | null;
  onClose: () => void;
  onDecided: (session: CopilotSessionResponse) => void;
}) {
  const [actions, setActions] = useState<CopilotProposedAction[]>([]);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [error, setError] = useState("");
  const [pending, setPending] = useState<"confirm" | "reject" | null>(null);
  const [done, setDone] = useState<CopilotSessionResponse | null>(null);

  useEffect(() => {
    if (!session) return;
    setActions(
      session.actions.map((action) => ({
        ...action,
        quote: action.quote
          ? { ...action.quote, lines: action.quote.lines.map((line) => ({ ...line })) }
          : undefined,
        customer: action.customer ? { ...action.customer } : undefined,
        fieldReport: action.fieldReport ? { ...action.fieldReport } : undefined,
        note: action.note ? { ...action.note } : undefined,
        followUp: action.followUp ? { ...action.followUp } : undefined,
      })),
    );
    const initial: Record<string, boolean> = {};
    for (const action of session.actions) {
      initial[action.id] =
        action.status === "proposed" && action.type !== "unsupported" && !action.blockReason;
    }
    setSelected(initial);
    setError("");
    setDone(null);
    setPending(null);
  }, [session]);

  const priceMissing = useMemo(
    () =>
      actions.some(
        (action) =>
          selected[action.id] &&
          action.type === "quote_draft" &&
          (action.quote?.lines ?? []).some((line) => line.unitPrice == null),
      ),
    [actions, selected],
  );

  const selectedCount = actions.filter((action) => selected[action.id]).length;
  const canConfirm =
    session?.status === "pending" && selectedCount > 0 && !priceMissing && !pending;

  function patch(id: string, recipe: (action: CopilotProposedAction) => CopilotProposedAction) {
    setActions((current) => current.map((action) => (action.id === id ? recipe(action) : action)));
  }

  async function submit(decision: "confirm" | "reject") {
    if (!session) return;
    setError("");
    setPending(decision);
    try {
      const edits: CopilotActionEdit[] =
        decision === "confirm"
          ? actions
              .filter((action) => selected[action.id])
              .map((action) => ({
                id: action.id,
                fieldReport: action.fieldReport,
                customer: action.customer,
                quote: action.quote,
                note: action.note,
                followUp: action.followUp,
              }))
          : [];
      const updated = await decideCopilotSession(session.id, {
        decision,
        ...(decision === "confirm" ? { actions: edits } : {}),
      });
      setDone(updated);
      onDecided(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "L'instruction n'a pas pu être traitée.");
    } finally {
      setPending(null);
    }
  }

  const view = done ?? session;
  const finished = view != null && view.status !== "pending";

  return (
    <FormDialog
      open={session != null}
      onClose={onClose}
      title="Instruction du copilote"
      description="Rien n'est enregistré dans le CRM tant que vous n'avez pas confirmé. Aucun message n'est envoyé au client."
      closeDisabled={pending != null}
      footer={
        finished ? (
          <FormDialogPrimaryButton onClick={onClose}>Fermer</FormDialogPrimaryButton>
        ) : (
          <>
            <FormDialogCancelButton
              disabled={pending != null}
              onClick={() => void submit("reject")}
            >
              {pending === "reject" ? "Ignore…" : "Ignorer"}
            </FormDialogCancelButton>
            <FormDialogPrimaryButton disabled={!canConfirm} onClick={() => void submit("confirm")}>
              {pending === "confirm" ? "Enregistrement…" : "Enregistrer dans le CRM"}
            </FormDialogPrimaryButton>
          </>
        )
      }
    >
      {view?.message ? (
        <p className="mb-3 text-sm text-slate-600 dark:text-slate-300">{view.message}</p>
      ) : null}
      {error ? (
        <p className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
          {error}
        </p>
      ) : null}
      <p className="text-sm text-slate-800 dark:text-slate-100 whitespace-pre-wrap">
        {view?.transcript}
      </p>
      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{view?.intent}</p>
      <ul className="mt-4 space-y-3">
        {(finished ? (view?.actions ?? []) : actions).map((action) => (
          <li
            key={action.id}
            className="rounded-xl border border-slate-200 dark:border-slate-700 p-3"
          >
            <div className="flex items-start gap-2">
              {!finished && action.status === "proposed" && !action.blockReason ? (
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                  checked={Boolean(selected[action.id])}
                  onChange={(event) =>
                    setSelected((current) => ({ ...current, [action.id]: event.target.checked }))
                  }
                  aria-label={`Retenir : ${action.summary}`}
                />
              ) : null}
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                  {COPILOT_ACTION_LABELS[action.type]}
                </p>
                <p className="text-sm text-slate-800 dark:text-slate-100">{action.summary}</p>
                {action.blockReason ? (
                  <p className={formFieldHintClassName}>{action.blockReason}</p>
                ) : null}
                {action.result ? (
                  <p className="mt-1 text-sm">
                    {safeHref(action.result.href) ? (
                      <Link
                        href={safeHref(action.result.href)!}
                        className="font-medium text-brand-600 hover:text-brand-500"
                      >
                        {action.result.label}
                      </Link>
                    ) : (
                      <span>{action.result.label}</span>
                    )}
                  </p>
                ) : null}
              </div>
            </div>
            {!finished && selected[action.id] ? (
              <ActionFields action={action} onPatch={(recipe) => patch(action.id, recipe)} />
            ) : null}
          </li>
        ))}
      </ul>
      {!finished && priceMissing ? (
        <p className={formFieldHintClassName}>
          Indiquez un prix pour chaque ligne du devis. Le copilote ne fixe pas les montants.
        </p>
      ) : null}
    </FormDialog>
  );
}

function ActionFields({
  action,
  onPatch,
}: {
  action: CopilotProposedAction;
  onPatch: (recipe: (action: CopilotProposedAction) => CopilotProposedAction) => void;
}) {
  if (action.type === "field_report" && action.fieldReport) {
    return (
      <label className="mt-3 block">
        <span className={formFieldLabelClassName}>Compte-rendu</span>
        <textarea
          className={formFieldInputClassName}
          rows={5}
          value={action.fieldReport.reportText}
          onChange={(event) =>
            onPatch((current) => ({
              ...current,
              fieldReport: { ...current.fieldReport!, reportText: event.target.value },
            }))
          }
        />
      </label>
    );
  }
  if (action.type === "case_note" && action.note) {
    return (
      <label className="mt-3 block">
        <span className={formFieldLabelClassName}>Note</span>
        <textarea
          className={formFieldInputClassName}
          rows={3}
          value={action.note.body}
          onChange={(event) =>
            onPatch((current) => ({
              ...current,
              note: { ...current.note!, body: event.target.value },
            }))
          }
        />
      </label>
    );
  }
  if (action.type === "customer_upsert" && action.customer) {
    const customer = action.customer;
    return (
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <label>
          <span className={formFieldLabelClassName}>Prénom</span>
          <input
            className={formFieldInputClassName}
            value={customer.firstName ?? ""}
            onChange={(event) =>
              onPatch((current) => ({
                ...current,
                customer: { ...current.customer!, firstName: event.target.value },
              }))
            }
          />
        </label>
        <label>
          <span className={formFieldLabelClassName}>Nom</span>
          <input
            className={formFieldInputClassName}
            value={customer.lastName ?? ""}
            onChange={(event) =>
              onPatch((current) => ({
                ...current,
                customer: { ...current.customer!, lastName: event.target.value },
              }))
            }
          />
        </label>
        <label className="sm:col-span-2">
          <span className={formFieldLabelClassName}>Raison sociale</span>
          <input
            className={formFieldInputClassName}
            value={customer.companyName ?? ""}
            onChange={(event) =>
              onPatch((current) => ({
                ...current,
                customer: { ...current.customer!, companyName: event.target.value },
              }))
            }
          />
        </label>
        <label>
          <span className={formFieldLabelClassName}>Téléphone</span>
          <input
            className={formFieldInputClassName}
            value={customer.phone ?? ""}
            onChange={(event) =>
              onPatch((current) => ({
                ...current,
                customer: { ...current.customer!, phone: event.target.value },
              }))
            }
          />
        </label>
        <label>
          <span className={formFieldLabelClassName}>E-mail</span>
          <input
            className={formFieldInputClassName}
            value={customer.email ?? ""}
            onChange={(event) =>
              onPatch((current) => ({
                ...current,
                customer: { ...current.customer!, email: event.target.value },
              }))
            }
          />
        </label>
      </div>
    );
  }
  if (action.type === "quote_draft" && action.quote) {
    const quote = action.quote;
    return (
      <div className="mt-3 space-y-2">
        <label className="block">
          <span className={formFieldLabelClassName}>Objet</span>
          <input
            className={formFieldInputClassName}
            value={quote.subject}
            onChange={(event) =>
              onPatch((current) => ({
                ...current,
                quote: { ...current.quote!, subject: event.target.value },
              }))
            }
          />
        </label>
        {quote.lines.map((line, index) => (
          <div key={`${line.description}-${index}`} className="grid gap-2 sm:grid-cols-3">
            <label className="sm:col-span-3">
              <span className={formFieldLabelClassName}>Ligne</span>
              <input className={formFieldInputClassName} value={line.description} readOnly />
            </label>
            <label>
              <span className={formFieldLabelClassName}>Quantité</span>
              <input
                className={formFieldInputClassName}
                type="number"
                min={0.01}
                step="0.01"
                value={line.quantity}
                onChange={(event) =>
                  onPatch((current) => ({
                    ...current,
                    quote: {
                      ...current.quote!,
                      lines: current.quote!.lines.map((item, itemIndex) =>
                        itemIndex === index
                          ? { ...item, quantity: Number(event.target.value) }
                          : item,
                      ),
                    },
                  }))
                }
              />
            </label>
            <label>
              <span className={formFieldLabelClassName}>Prix unitaire HT</span>
              <input
                className={formFieldInputClassName}
                type="number"
                min={0}
                step="0.01"
                value={line.unitPrice ?? ""}
                onChange={(event) => {
                  const raw = event.target.value;
                  const unitPrice = raw === "" ? null : Number(raw);
                  onPatch((current) => ({
                    ...current,
                    quote: {
                      ...current.quote!,
                      lines: current.quote!.lines.map((item, itemIndex) =>
                        itemIndex === index ? { ...item, unitPrice } : item,
                      ),
                    },
                  }));
                }}
              />
            </label>
            <label>
              <span className={formFieldLabelClassName}>TVA</span>
              <select
                className={formFieldInputClassName}
                value={String(line.tvaRate)}
                onChange={(event) =>
                  onPatch((current) => ({
                    ...current,
                    quote: {
                      ...current.quote!,
                      lines: current.quote!.lines.map((item, itemIndex) =>
                        itemIndex === index
                          ? { ...item, tvaRate: Number(event.target.value) as TvaRate }
                          : item,
                      ),
                    },
                  }))
                }
              >
                {TVA_RATES.map((rate) => (
                  <option key={rate} value={rate}>
                    {rate} %
                  </option>
                ))}
              </select>
            </label>
          </div>
        ))}
        {quote.createCase ? (
          <p className={formFieldHintClassName}>
            Un dossier brouillon sera créé pour porter ce devis.
          </p>
        ) : null}
      </div>
    );
  }
  if (action.type === "schedule_follow_up" && action.followUp) {
    return (
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <label className="sm:col-span-2">
          <span className={formFieldLabelClassName}>Titre</span>
          <input
            className={formFieldInputClassName}
            value={action.followUp.title}
            onChange={(event) =>
              onPatch((current) => ({
                ...current,
                followUp: { ...current.followUp!, title: event.target.value },
              }))
            }
          />
        </label>
        <label>
          <span className={formFieldLabelClassName}>Début</span>
          <input
            className={formFieldInputClassName}
            type="datetime-local"
            value={toLocalInput(action.followUp.scheduledStart)}
            onChange={(event) =>
              onPatch((current) => ({
                ...current,
                followUp: {
                  ...current.followUp!,
                  scheduledStart: fromLocalInput(event.target.value),
                },
              }))
            }
          />
        </label>
      </div>
    );
  }
  return null;
}
