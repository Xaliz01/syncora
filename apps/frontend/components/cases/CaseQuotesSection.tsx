"use client";

import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as quotesApi from "@/lib/quotes.api";
import * as stockApi from "@/lib/stock.api";
import { usePermissions } from "@/lib/hooks/usePermissions";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import type { QuoteStatus, TvaRate, ArticleResponse } from "@planwise/shared";
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
  articleId?: string;
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

function ArticleAutocomplete({
  value,
  articles,
  onSelect,
  onChange,
}: {
  value: string;
  articles: ArticleResponse[];
  onSelect: (article: ArticleResponse) => void;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filtered = articles.filter(
    (a) =>
      a.name.toLowerCase().includes(search.toLowerCase()) ||
      a.reference.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div ref={wrapperRef} className="relative">
      <input
        type="text"
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setSearch(e.target.value);
          setOpen(true);
        }}
        onFocus={() => {
          setSearch(value);
          setOpen(true);
        }}
        placeholder="Prestation ou article du stock"
        className="w-full rounded-md border border-slate-200 dark:border-slate-700 px-2 py-1.5 text-xs focus:border-brand-500 focus:outline-none"
      />
      {open && filtered.length > 0 && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 max-h-40 overflow-y-auto rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-lg">
          {filtered.slice(0, 10).map((article) => (
            <button
              key={article.id}
              type="button"
              className="w-full text-left px-2 py-1.5 text-xs hover:bg-slate-50 dark:hover:bg-slate-800 border-b border-slate-100 dark:border-slate-800 last:border-0"
              onClick={() => {
                onSelect(article);
                setOpen(false);
              }}
            >
              <span className="font-medium text-slate-700 dark:text-slate-200">{article.name}</span>
              <span className="ml-2 text-slate-400">[{article.reference}]</span>
              {article.defaultPrice !== undefined && (
                <span className="ml-2 text-brand-600 dark:text-brand-400">
                  {article.defaultPrice.toLocaleString("fr-FR", {
                    minimumFractionDigits: 2,
                  })}{" "}
                  €
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
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
  const { can } = usePermissions();
  const [subject, setSubject] = useState(initialSubject ?? "");
  const [notes, setNotes] = useState(initialNotes ?? "");
  const [validUntil, setValidUntil] = useState(initialValidUntil?.split("T")[0] ?? "");
  const [lines, setLines] = useState<QuoteLine[]>(
    initialLines?.length ? initialLines : [{ ...EMPTY_LINE }],
  );
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const previewUrlRef = useRef<string | null>(null);

  const { data: articles = [] } = useQuery({
    queryKey: ["stock-articles-for-quotes"],
    queryFn: () => stockApi.listArticles({ activeOnly: true }),
    enabled: can("stock.articles.read"),
    staleTime: 60_000,
  });

  const updateLine = (idx: number, patch: Partial<QuoteLine>) => {
    setLines((prev) => prev.map((l, i) => (i === idx ? { ...l, ...patch } : l)));
  };

  const removeLine = (idx: number) => {
    setLines((prev) => prev.filter((_, i) => i !== idx));
  };

  const selectArticle = (idx: number, article: ArticleResponse) => {
    updateLine(idx, {
      articleId: article.id,
      description: article.name,
      unitPrice: article.defaultPrice ?? 0,
      unit: article.unit ?? "unité",
    });
  };

  const totalHt = lines.reduce((s, l) => s + l.quantity * l.unitPrice, 0);
  const totalTtc = lines.reduce((s, l) => s + l.quantity * l.unitPrice * (1 + l.tvaRate / 100), 0);
  const filledLines = lines.filter((l) => l.description.trim());

  useEffect(() => {
    if (filledLines.length === 0) {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
        previewUrlRef.current = null;
      }
      setPreviewUrl(null);
      setPreviewError(null);
      setPreviewLoading(false);
      return;
    }

    let cancelled = false;
    setPreviewLoading(true);
    const timer = window.setTimeout(() => {
      void quotesApi
        .previewQuotePdf({
          caseId,
          subject: subject.trim() || undefined,
          notes: notes.trim() || undefined,
          validUntil: validUntil || undefined,
          lines: filledLines,
        })
        .then((url) => {
          if (cancelled) {
            URL.revokeObjectURL(url);
            return;
          }
          if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
          previewUrlRef.current = url;
          setPreviewUrl(url);
          setPreviewError(null);
        })
        .catch((err: unknown) => {
          if (cancelled) return;
          setPreviewError(err instanceof Error ? err.message : "Aperçu indisponible");
        })
        .finally(() => {
          if (!cancelled) setPreviewLoading(false);
        });
    }, 450);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [caseId, subject, notes, validUntil, lines]);

  useEffect(() => {
    return () => {
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    };
  }, []);

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 h-full min-h-0">
      <div className="space-y-4 min-w-0 overflow-y-auto pr-1">
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
                className="grid grid-cols-[1fr_64px_88px_72px_56px_28px] gap-1.5 items-end"
              >
                <div>
                  {idx === 0 && (
                    <span className="text-[10px] text-slate-500 dark:text-slate-400">
                      Description
                    </span>
                  )}
                  {articles.length > 0 ? (
                    <ArticleAutocomplete
                      value={line.description}
                      articles={articles}
                      onSelect={(article) => selectArticle(idx, article)}
                      onChange={(val) =>
                        updateLine(idx, { description: val, articleId: undefined })
                      }
                    />
                  ) : (
                    <input
                      type="text"
                      value={line.description}
                      onChange={(e) => updateLine(idx, { description: e.target.value })}
                      placeholder="Prestation ou article"
                      className="w-full rounded-md border border-slate-200 dark:border-slate-700 px-2 py-1.5 text-xs focus:border-brand-500 focus:outline-none"
                    />
                  )}
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
                    onChange={(e) =>
                      updateLine(idx, { tvaRate: Number(e.target.value) as TvaRate })
                    }
                    className="w-full rounded-md border border-slate-200 dark:border-slate-700 px-1 py-1.5 text-xs focus:border-brand-500 focus:outline-none"
                  >
                    {TVA_RATES.map((r) => (
                      <option key={r} value={r}>
                        {r} %
                      </option>
                    ))}
                  </select>
                </div>
                <div className="text-right text-[11px] font-medium text-slate-700 dark:text-slate-200 py-1.5">
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

        <div>
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
                lines: filledLines,
              })
            }
            disabled={isPending || filledLines.length === 0}
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

      <div className="min-w-0 min-h-[45vh] xl:min-h-0 flex flex-col h-full">
        <div className="flex items-center justify-between mb-2 shrink-0">
          <h4 className="text-xs font-semibold text-slate-700 dark:text-slate-200 uppercase tracking-wide">
            Aperçu PDF
          </h4>
          {previewLoading && <span className="text-[11px] text-slate-400">Mise à jour…</span>}
        </div>
        <div className="flex-1 min-h-0 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-950 overflow-hidden">
          {previewUrl ? (
            <iframe title="Aperçu du devis" src={previewUrl} className="h-full w-full bg-white" />
          ) : (
            <div className="flex h-full items-center justify-center px-6 text-center text-sm text-slate-500 dark:text-slate-400">
              {previewError ? previewError : "Ajoutez une ligne pour prévisualiser le devis."}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function QuoteEditorOverlay({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[90] flex flex-col bg-slate-50 dark:bg-slate-950">
      <header className="shrink-0 flex items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-3 sm:px-6">
        <div>
          <p className="text-[11px] uppercase tracking-wide text-slate-400 dark:text-slate-500">
            Devis
          </p>
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-50">{title}</h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg border border-slate-200 dark:border-slate-600 px-3 py-1.5 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
        >
          Fermer
        </button>
      </header>
      <div className="flex-1 min-h-0 overflow-hidden p-4 sm:p-6">{children}</div>
    </div>,
    document.body,
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
            onClick={() => setShowCreate(true)}
            className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition self-start"
          >
            + Nouveau devis
          </button>
        )}
      </div>

      {showCreate && (
        <QuoteEditorOverlay title="Nouveau devis" onClose={() => setShowCreate(false)}>
          <QuoteForm
            caseId={caseId}
            submitLabel="Créer le devis"
            onSubmit={(data) => createMutation.mutate(data)}
            onCancel={() => setShowCreate(false)}
            isPending={createMutation.isPending}
          />
        </QuoteEditorOverlay>
      )}

      {editingQuoteId && editingQuote && (
        <QuoteEditorOverlay
          title={`Modifier ${editingQuote.quoteNumber}`}
          onClose={() => setEditingQuoteId(null)}
        >
          <QuoteForm
            caseId={caseId}
            initialSubject={editingQuote.subject}
            initialNotes={editingQuote.notes}
            initialValidUntil={editingQuote.validUntil}
            initialLines={editingQuote.lines.map((l) => ({
              articleId: l.articleId,
              description: l.description,
              quantity: l.quantity,
              unitPrice: l.unitPrice,
              tvaRate: l.tvaRate,
              unit: l.unit ?? "unité",
            }))}
            submitLabel="Enregistrer"
            onSubmit={(data) =>
              updateMutation.mutate({
                id: editingQuote.id,
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
        </QuoteEditorOverlay>
      )}

      {quotes.length > 0 ? (
        <div className="space-y-2">
          {quotes.map((quote) => {
            return (
              <div
                key={quote.id}
                className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-3 shadow-sm dark:shadow-slate-950/20"
              >
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
                    {can("quotes.read") && (
                      <button
                        onClick={() => quotesApi.downloadQuotePdf(quote.id, quote.quoteNumber)}
                        className="text-[10px] text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                        title="Télécharger le PDF"
                      >
                        PDF
                      </button>
                    )}
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
                      Valide jusqu&apos;au {new Date(quote.validUntil).toLocaleDateString("fr-FR")}
                    </span>
                  )}
                  {quote.createdAt && (
                    <span>Créé le {new Date(quote.createdAt).toLocaleDateString("fr-FR")}</span>
                  )}
                </div>
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
