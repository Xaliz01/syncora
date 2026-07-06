"use client";

import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as quotesApi from "@/lib/quotes.api";
import { usePermissions } from "@/lib/hooks/usePermissions";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import type { QuoteStatus, TvaRate } from "@planwise/shared";
import { QUOTE_STATUS_LABELS, TVA_RATES } from "@planwise/shared";

const STATUS_COLORS: Record<QuoteStatus, string> = {
  draft:
    "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700",
  sent: "bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800",
  accepted:
    "bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800",
  rejected:
    "bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-300 border-red-200 dark:border-red-800",
  cancelled:
    "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700",
};

interface QuoteLine {
  description: string;
  quantity: number;
  unitPrice: number;
  tvaRate: TvaRate;
  unit: string;
}

const EMPTY_LINE: QuoteLine = {
  description: "",
  quantity: 1,
  unitPrice: 0,
  tvaRate: 20,
  unit: "unité",
};

function formatCurrency(value: number): string {
  return value.toLocaleString("fr-FR", {
    style: "currency",
    currency: "EUR",
  });
}

function QuoteForm({
  caseId,
  initialSubject,
  initialNotes,
  initialValidUntil,
  initialLines,
  submitLabel,
  onSubmit,
  onCancel,
  isPending,
}: {
  caseId: string;
  initialSubject?: string;
  initialNotes?: string;
  initialValidUntil?: string;
  initialLines?: QuoteLine[];
  submitLabel: string;
  onSubmit: (data: {
    caseId: string;
    subject?: string;
    notes?: string;
    validUntil?: string;
    lines: QuoteLine[];
  }) => void;
  onCancel: () => void;
  isPending: boolean;
}) {
  const [subject, setSubject] = useState(initialSubject ?? "");
  const [notes, setNotes] = useState(initialNotes ?? "");
  const [validUntil, setValidUntil] = useState(initialValidUntil?.split("T")[0] ?? "");
  const [lines, setLines] = useState<QuoteLine[]>(
    initialLines?.length ? initialLines : [{ ...EMPTY_LINE }],
  );

  const updateLine = (idx: number, patch: Partial<QuoteLine>) => {
    setLines((prev) => prev.map((l, i) => (i === idx ? { ...l, ...patch } : l)));
  };

  const removeLine = (idx: number) => {
    setLines((prev) => prev.filter((_, i) => i !== idx));
  };

  const totalHt = lines.reduce((s, l) => s + l.quantity * l.unitPrice, 0);
  const totalTtc = lines.reduce((s, l) => s + l.quantity * l.unitPrice * (1 + l.tvaRate / 100), 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
            Objet du devis
          </label>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Ex. Remplacement chaudière + raccordements"
            className="w-full rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
            Valable jusqu&apos;au
          </label>
          <input
            type="date"
            value={validUntil}
            onChange={(e) => setValidUntil(e.target.value)}
            className="w-full rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
          />
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-xs font-semibold text-slate-700 dark:text-slate-200 uppercase tracking-wide">
            Lignes
          </h4>
          <button
            type="button"
            onClick={() => setLines((prev) => [...prev, { ...EMPTY_LINE }])}
            className="text-[11px] text-brand-600 dark:text-brand-400 hover:text-brand-500 font-medium"
          >
            + Ajouter une ligne
          </button>
        </div>

        <div className="space-y-2">
          {lines.map((line, idx) => (
            <div
              key={idx}
              className="grid grid-cols-[1fr_80px_100px_80px_70px_32px] gap-2 items-end"
            >
              <div>
                {idx === 0 && (
                  <span className="text-[10px] text-slate-500 dark:text-slate-400">
                    Description
                  </span>
                )}
                <input
                  type="text"
                  value={line.description}
                  onChange={(e) => updateLine(idx, { description: e.target.value })}
                  placeholder="Prestation ou article"
                  className="w-full rounded-md border border-slate-200 dark:border-slate-700 px-2 py-1.5 text-xs focus:border-brand-500 focus:outline-none"
                />
              </div>
              <div>
                {idx === 0 && (
                  <span className="text-[10px] text-slate-500 dark:text-slate-400">Qté</span>
                )}
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  value={line.quantity}
                  onChange={(e) => updateLine(idx, { quantity: Number(e.target.value) || 0 })}
                  className="w-full rounded-md border border-slate-200 dark:border-slate-700 px-2 py-1.5 text-xs text-right focus:border-brand-500 focus:outline-none"
                />
              </div>
              <div>
                {idx === 0 && (
                  <span className="text-[10px] text-slate-500 dark:text-slate-400">Prix HT</span>
                )}
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  value={line.unitPrice}
                  onChange={(e) => updateLine(idx, { unitPrice: Number(e.target.value) || 0 })}
                  className="w-full rounded-md border border-slate-200 dark:border-slate-700 px-2 py-1.5 text-xs text-right focus:border-brand-500 focus:outline-none"
                />
              </div>
              <div>
                {idx === 0 && (
                  <span className="text-[10px] text-slate-500 dark:text-slate-400">TVA</span>
                )}
                <select
                  value={line.tvaRate}
                  onChange={(e) => updateLine(idx, { tvaRate: Number(e.target.value) as TvaRate })}
                  className="w-full rounded-md border border-slate-200 dark:border-slate-700 px-1 py-1.5 text-xs focus:border-brand-500 focus:outline-none"
                >
                  {TVA_RATES.map((r) => (
                    <option key={r} value={r}>
                      {r} %
                    </option>
                  ))}
                </select>
              </div>
              <div className="text-right text-xs font-medium text-slate-700 dark:text-slate-200 py-1.5">
                {formatCurrency(Math.round(line.quantity * line.unitPrice * 100) / 100)}
              </div>
              <div>
                <button
                  type="button"
                  onClick={() => removeLine(idx)}
                  disabled={lines.length <= 1}
                  className="text-slate-400 hover:text-red-500 disabled:opacity-30 p-1"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-end gap-6 text-sm border-t border-slate-200 dark:border-slate-700 pt-3">
        <div className="text-slate-500 dark:text-slate-400">
          Total HT :{" "}
          <span className="font-semibold text-slate-800 dark:text-slate-100">
            {formatCurrency(totalHt)}
          </span>
        </div>
        <div className="text-slate-500 dark:text-slate-400">
          Total TTC :{" "}
          <span className="font-semibold text-slate-800 dark:text-slate-100">
            {formatCurrency(totalTtc)}
          </span>
        </div>
      </div>

      <div className="sm:col-span-2">
        <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
          Notes / conditions
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          placeholder="Conditions de paiement, délais, remarques…"
          className="w-full rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
        />
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() =>
            onSubmit({
              caseId,
              subject: subject.trim() || undefined,
              notes: notes.trim() || undefined,
              validUntil: validUntil || undefined,
              lines: lines.filter((l) => l.description.trim()),
            })
          }
          disabled={isPending || lines.every((l) => !l.description.trim())}
          className="rounded-lg bg-brand-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-brand-500 disabled:opacity-50 transition"
        >
          {isPending ? "…" : submitLabel}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
        >
          Annuler
        </button>
      </div>
    </div>
  );
}

export function CaseQuotesSection({ caseId }: { caseId: string }) {
  const queryClient = useQueryClient();
  const confirm = useConfirm();
  const { can } = usePermissions();
  const [showCreate, setShowCreate] = useState(false);
  const [editingQuoteId, setEditingQuoteId] = useState<string | null>(null);

  const { data: quotes = [] } = useQuery({
    queryKey: ["quotes", caseId],
    queryFn: () => quotesApi.listQuotes({ caseId }),
    enabled: can("quotes.read"),
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["quotes", caseId] });
    queryClient.invalidateQueries({ queryKey: ["case-history", caseId] });
  };

  const createMutation = useMutation({
    mutationFn: (payload: quotesApi.CreateQuotePayload) => quotesApi.createQuote(payload),
    onSuccess: () => {
      invalidate();
      setShowCreate(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: quotesApi.UpdateQuotePayload }) =>
      quotesApi.updateQuote(id, payload),
    onSuccess: () => {
      invalidate();
      setEditingQuoteId(null);
    },
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      quotesApi.updateQuote(id, { status }),
    onSuccess: invalidate,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => quotesApi.deleteQuote(id),
    onSuccess: invalidate,
  });

  const { data: editingQuote } = useQuery({
    queryKey: ["quote", editingQuoteId],
    queryFn: () => quotesApi.getQuote(editingQuoteId!),
    enabled: !!editingQuoteId,
  });

  if (!can("quotes.read")) return null;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
          Devis ({quotes.length})
        </h2>
        {can("quotes.create") && (
          <button
            onClick={() => setShowCreate(!showCreate)}
            className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition self-start"
          >
            {showCreate ? "Annuler" : "+ Nouveau devis"}
          </button>
        )}
      </div>

      {showCreate && (
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 shadow-sm dark:shadow-slate-950/20">
          <QuoteForm
            caseId={caseId}
            submitLabel="Créer le devis"
            onSubmit={(data) => createMutation.mutate(data)}
            onCancel={() => setShowCreate(false)}
            isPending={createMutation.isPending}
          />
        </div>
      )}

      {quotes.length > 0 ? (
        <div className="space-y-2">
          {quotes.map((quote) => {
            const isEditing = editingQuoteId === quote.id;

            return (
              <div
                key={quote.id}
                className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-3 shadow-sm dark:shadow-slate-950/20"
              >
                {isEditing && editingQuote ? (
                  <QuoteForm
                    caseId={caseId}
                    initialSubject={editingQuote.subject}
                    initialNotes={editingQuote.notes}
                    initialValidUntil={editingQuote.validUntil}
                    initialLines={editingQuote.lines.map((l) => ({
                      description: l.description,
                      quantity: l.quantity,
                      unitPrice: l.unitPrice,
                      tvaRate: l.tvaRate,
                      unit: l.unit ?? "unité",
                    }))}
                    submitLabel="Enregistrer"
                    onSubmit={(data) =>
                      updateMutation.mutate({
                        id: quote.id,
                        payload: {
                          subject: data.subject,
                          notes: data.notes,
                          validUntil: data.validUntil ?? null,
                          lines: data.lines,
                        },
                      })
                    }
                    onCancel={() => setEditingQuoteId(null)}
                    isPending={updateMutation.isPending}
                  />
                ) : (
                  <>
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-slate-500 dark:text-slate-400">
                          {quote.quoteNumber}
                        </span>
                        <span
                          className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${STATUS_COLORS[quote.status]}`}
                        >
                          {QUOTE_STATUS_LABELS[quote.status]}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        {can("quotes.update") && quote.status === "draft" && (
                          <button
                            onClick={() => setEditingQuoteId(quote.id)}
                            className="text-[10px] text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                          >
                            Modifier
                          </button>
                        )}
                        {can("quotes.update") && quote.status === "draft" && (
                          <button
                            onClick={() => statusMutation.mutate({ id: quote.id, status: "sent" })}
                            disabled={statusMutation.isPending}
                            className="text-[10px] text-blue-600 hover:text-blue-700 px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-950/30"
                          >
                            Envoyer
                          </button>
                        )}
                        {can("quotes.update") && quote.status === "sent" && (
                          <>
                            <button
                              onClick={() =>
                                statusMutation.mutate({ id: quote.id, status: "accepted" })
                              }
                              disabled={statusMutation.isPending}
                              className="text-[10px] text-green-600 hover:text-green-700 px-1.5 py-0.5 rounded bg-green-50 dark:bg-green-950/30"
                            >
                              Accepter
                            </button>
                            <button
                              onClick={() =>
                                statusMutation.mutate({ id: quote.id, status: "rejected" })
                              }
                              disabled={statusMutation.isPending}
                              className="text-[10px] text-red-600 hover:text-red-700 px-1.5 py-0.5 rounded bg-red-50 dark:bg-red-950/30"
                            >
                              Refuser
                            </button>
                          </>
                        )}
                        {can("quotes.delete") && (
                          <button
                            onClick={async () => {
                              const ok = await confirm({
                                title: "Supprimer ce devis ?",
                                description: `Le devis ${quote.quoteNumber} sera supprimé définitivement.`,
                                confirmLabel: "Supprimer",
                                variant: "danger",
                              });
                              if (ok) deleteMutation.mutate(quote.id);
                            }}
                            className="text-[10px] text-red-500 hover:text-red-700 px-1.5 py-0.5 rounded border border-red-200 dark:border-red-800 hover:bg-red-50 dark:hover:bg-red-950/30 transition"
                          >
                            Supprimer
                          </button>
                        )}
                      </div>
                    </div>
                    {quote.subject && (
                      <p className="mt-1 text-sm font-medium text-slate-800 dark:text-slate-100">
                        {quote.subject}
                      </p>
                    )}
                    <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                      <span>
                        HT :{" "}
                        <span className="font-medium text-slate-700 dark:text-slate-200">
                          {formatCurrency(quote.totalHt)}
                        </span>
                      </span>
                      <span>
                        TTC :{" "}
                        <span className="font-medium text-slate-700 dark:text-slate-200">
                          {formatCurrency(quote.totalTtc)}
                        </span>
                      </span>
                      {quote.validUntil && (
                        <span>
                          Valide jusqu&apos;au{" "}
                          {new Date(quote.validUntil).toLocaleDateString("fr-FR")}
                        </span>
                      )}
                      {quote.createdAt && (
                        <span>Créé le {new Date(quote.createdAt).toLocaleDateString("fr-FR")}</span>
                      )}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        !showCreate && (
          <div className="text-sm text-slate-500 dark:text-slate-400">
            Aucun devis pour ce dossier.
          </div>
        )
      )}
    </div>
  );
}
