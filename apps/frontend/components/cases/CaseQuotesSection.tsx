"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as quotesApi from "@/lib/quotes.api";
import * as stockApi from "@/lib/stock.api";
import { usePermissions } from "@/lib/hooks/usePermissions";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import {
  CommercialLinesEditor,
  EMPTY_COMMERCIAL_LINE,
  formatCommercialCurrency as formatCurrency,
  type CatalogPickItem,
  type CommercialLineDraft,
} from "@/components/billing/CommercialLinesEditor";
import type { CaseInvoiceSyncStatus, QuoteStatus, TvaRate } from "@planwise/shared";
import {
  QUOTE_STATUS_LABELS,
  MAX_PAGE_LIMIT,
  quoteInvoicedHt,
  remainingQuoteHt,
  remainingQuotePercent,
} from "@planwise/shared";

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

/** iOS / iPadOS ne rendent pas les PDF dans un iframe (blob URL). */
function useInlinePdfPreviewSupported(): boolean {
  const [supported, setSupported] = useState(true);
  useEffect(() => {
    const ua = navigator.userAgent;
    const iOS =
      /iPad|iPhone|iPod/.test(ua) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    setSupported(!iOS);
  }, []);
  return supported;
}

type QuoteLine = CommercialLineDraft;

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
    initialLines?.length ? initialLines : [{ ...EMPTY_COMMERCIAL_LINE }],
  );
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [importingTerrain, setImportingTerrain] = useState(false);
  const previewUrlRef = useRef<string | null>(null);
  const inlinePdfSupported = useInlinePdfPreviewSupported();

  const { data: articlesData } = useQuery({
    queryKey: ["stock-articles-for-quotes"],
    queryFn: () => stockApi.listArticles({ activeOnly: true, limit: MAX_PAGE_LIMIT }),
    enabled: can("stock.articles.read"),
    staleTime: 60_000,
  });
  const articles = articlesData?.articles ?? [];

  const { data: prestationsData } = useQuery({
    queryKey: ["prestations-for-quotes"],
    queryFn: () => stockApi.listPrestations({ activeOnly: true, limit: MAX_PAGE_LIMIT }),
    enabled: can("prestations.read"),
    staleTime: 60_000,
  });
  const prestations = prestationsData?.prestations ?? [];

  const catalogItems = useMemo((): CatalogPickItem[] => {
    const fromArticles: CatalogPickItem[] = articles.map((a) => ({
      id: a.id,
      kind: "article",
      name: a.name,
      reference: a.reference,
      unit: a.unit,
      defaultPrice: a.defaultPrice,
      defaultTvaRate: 20,
    }));
    const fromPrestations: CatalogPickItem[] = prestations.map((p) => ({
      id: p.id,
      kind: "prestation",
      name: p.name,
      reference: p.reference,
      unit: p.unit,
      defaultPrice: p.defaultPrice,
      defaultTvaRate: p.defaultTvaRate,
    }));
    return [...fromPrestations, ...fromArticles];
  }, [articles, prestations]);

  const importTerrainContribution = async () => {
    setImportingTerrain(true);
    try {
      const movements = await stockApi.listArticleMovements({ caseId, limit: 200 });
      const byArticle = new Map<
        string,
        { articleId: string; name: string; unit: string; net: number; price: number }
      >();
      const priceById = new Map(articles.map((a) => [a.id, a.defaultPrice ?? 0]));
      const unitById = new Map(articles.map((a) => [a.id, a.unit ?? "unité"]));

      for (const m of movements) {
        if (!m.interventionId) continue;
        if (m.movementType !== "in" && m.movementType !== "out") continue;
        const existing = byArticle.get(m.articleId) ?? {
          articleId: m.articleId,
          name: m.articleName,
          unit: unitById.get(m.articleId) ?? "unité",
          net: 0,
          price: priceById.get(m.articleId) ?? 0,
        };
        if (m.movementType === "out") existing.net += m.quantity;
        if (m.movementType === "in") existing.net -= m.quantity;
        byArticle.set(m.articleId, existing);
      }

      const imported: QuoteLine[] = [...byArticle.values()]
        .filter((a) => a.net > 0)
        .map((a) => ({
          articleId: a.articleId,
          description: a.name,
          quantity: Math.round(a.net * 1000) / 1000,
          unitPrice: a.price,
          tvaRate: 20 as TvaRate,
          unit: a.unit,
        }));

      if (imported.length === 0) return;

      setLines((prev) => {
        const kept = prev.filter((l) => l.description.trim());
        return [...kept, ...imported];
      });
    } finally {
      setImportingTerrain(false);
    }
  };

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
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 xl:h-full xl:min-h-0">
      <div className="space-y-4 min-w-0 xl:overflow-y-auto xl:pr-1">
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

        <CommercialLinesEditor
          lines={lines}
          onChange={setLines}
          catalogItems={catalogItems}
          secondaryAction={
            can("stock.movements.read") || can("stock.articles.read")
              ? {
                  label: "Import terrain",
                  pendingLabel: "Import…",
                  pending: importingTerrain,
                  title: "Importer les articles consommés sur les interventions du dossier",
                  onClick: () => void importTerrainContribution(),
                }
              : undefined
          }
        />

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

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
          >
            Annuler
          </button>
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
        </div>
      </div>

      <div
        className={`min-w-0 flex flex-col xl:h-full xl:min-h-0 ${
          previewUrl ? "min-h-[40vh]" : "hidden xl:flex"
        }`}
      >
        <div className="flex items-center justify-between gap-2 mb-2 shrink-0">
          <h4 className="text-xs font-semibold text-slate-700 dark:text-slate-200 uppercase tracking-wide">
            Aperçu PDF
          </h4>
          <div className="flex items-center gap-2">
            {previewLoading && <span className="text-[11px] text-slate-400">Mise à jour…</span>}
            {previewUrl && (
              <a
                href={previewUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-md border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 px-2.5 py-1 text-[11px] font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
              >
                Ouvrir
              </a>
            )}
          </div>
        </div>
        <div className="flex-1 min-h-[40vh] xl:min-h-0 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-950 overflow-hidden">
          {previewUrl ? (
            inlinePdfSupported ? (
              <iframe
                title="Aperçu du devis"
                src={previewUrl}
                className="h-full w-full min-h-[40vh] xl:min-h-0 bg-white"
              />
            ) : (
              <div className="flex h-full min-h-[40vh] flex-col items-center justify-center gap-3 px-6 text-center">
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  L&apos;aperçu intégré n&apos;est pas disponible sur cet appareil.
                </p>
                <a
                  href={previewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-500 transition"
                >
                  Ouvrir l&apos;aperçu PDF
                </a>
              </div>
            )
          ) : (
            <div className="flex h-full min-h-0 items-center justify-center px-6 text-center text-sm text-slate-500 dark:text-slate-400">
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
      <div className="flex-1 min-h-0 overflow-y-auto xl:overflow-hidden p-4 sm:p-6">{children}</div>
    </div>,
    document.body,
  );
}

export function CaseQuotesSection({
  caseId,
  invoices = [],
  invoiceCreate,
}: {
  caseId: string;
  invoices?: CaseInvoiceSyncStatus[];
  /** Boutons « Créer facture » (mêmes conditions que la card Facturation). */
  invoiceCreate?: {
    showPennylane: boolean;
    showQonto: boolean;
    showDemo?: boolean;
    pending: boolean;
    onCreate: (provider: "pennylane" | "qonto" | "demo", quoteId: string) => void;
  };
}) {
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
    queryClient.invalidateQueries({ queryKey: ["case", caseId] });
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
              prestationId: l.prestationId,
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
            const invoicedHt = quoteInvoicedHt(invoices, quote.id);
            const remainingHt = remainingQuoteHt(quote.totalHt, invoicedHt);
            const remainingPct = remainingQuotePercent(quote.totalHt, remainingHt);
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
                    {invoiceCreate?.showPennylane ? (
                      <button
                        type="button"
                        disabled={invoiceCreate.pending}
                        onClick={() => invoiceCreate.onCreate("pennylane", quote.id)}
                        className="text-[10px] text-brand-700 hover:text-brand-800 dark:text-brand-300 dark:hover:text-brand-200 px-1.5 py-0.5 rounded border border-brand-200 dark:border-brand-800 bg-brand-50 dark:bg-brand-950/40 hover:bg-brand-100 dark:hover:bg-brand-950/60 transition disabled:opacity-50"
                        title="Créer une facture Pennylane à partir de ce devis"
                      >
                        Facture Pennylane
                      </button>
                    ) : null}
                    {invoiceCreate?.showQonto ? (
                      <button
                        type="button"
                        disabled={invoiceCreate.pending}
                        onClick={() => invoiceCreate.onCreate("qonto", quote.id)}
                        className="text-[10px] text-slate-700 hover:text-slate-900 dark:text-slate-200 dark:hover:text-white px-1.5 py-0.5 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 transition disabled:opacity-50"
                        title="Créer une facture Qonto à partir de ce devis"
                      >
                        Facture Qonto
                      </button>
                    ) : null}
                    {invoiceCreate?.showDemo ? (
                      <button
                        type="button"
                        disabled={invoiceCreate.pending}
                        onClick={() => invoiceCreate.onCreate("demo", quote.id)}
                        className="text-[10px] text-slate-700 hover:text-slate-900 dark:text-slate-200 dark:hover:text-white px-1.5 py-0.5 rounded border border-dashed border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 transition disabled:opacity-50"
                        title="Créer une facture démo à partir de ce devis"
                      >
                        Facture démo
                      </button>
                    ) : null}
                    {can("quotes.delete") && quote.status === "draft" && (
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
                  {invoicedHt > 0 || quote.status === "accepted" ? (
                    <span>
                      Facturé :{" "}
                      <span className="font-medium text-slate-700 dark:text-slate-200">
                        {formatCurrency(invoicedHt)}
                      </span>
                      {" · reste : "}
                      <span className="font-medium text-amber-700 dark:text-amber-300">
                        {formatCurrency(remainingHt)} ({remainingPct} %)
                      </span>
                    </span>
                  ) : null}
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
