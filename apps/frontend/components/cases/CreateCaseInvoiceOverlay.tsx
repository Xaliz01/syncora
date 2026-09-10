"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type {
  ArticleResponse,
  CaseInvoiceKind,
  LocalInvoiceResponse,
  PrestationResponse,
  QuoteSummaryResponse,
  SyncCaseInvoiceLineInput,
  SyncCaseInvoiceOptions,
} from "@planwise/shared";
import {
  CASE_INVOICE_KIND_LABELS,
  CASE_INVOICE_KINDS,
  invoiceLinesFromArticleUsages,
  localInvoiceStatusToRemote,
  quoteInvoicedHt,
  remainingQuoteHt,
  remainingQuotePercent,
} from "@planwise/shared";
import { ElectronicInvoicingNotice } from "@/components/billing/ElectronicInvoicingNotice";
import {
  CommercialLinesEditor,
  EMPTY_COMMERCIAL_LINE,
  type CatalogPickItem,
  type CommercialLineDraft,
} from "@/components/billing/CommercialLinesEditor";
import * as billingApi from "@/lib/billing.api";

export type InterventionArticleUsageForInvoice = {
  articleId: string;
  articleName: string;
  unit?: string;
  netQuantity: number;
};

export type CreatedCaseInvoiceResult = LocalInvoiceResponse;

type InvoiceSource = "quote" | "lines";

type Props = {
  open: boolean;
  caseId: string;
  pending?: boolean;
  finalizePending?: boolean;
  providerLabel?: string;
  quotes: QuoteSummaryResponse[];
  invoices?: LocalInvoiceResponse[];
  initialQuoteId?: string | null;
  articleUsages?: InterventionArticleUsageForInvoice[];
  articles?: ArticleResponse[];
  prestations?: PrestationResponse[];
  createdResult?: CreatedCaseInvoiceResult | null;
  onClose: () => void;
  onSubmit: (options: SyncCaseInvoiceOptions) => void;
  onFinalizeNow: (invoiceId: string) => void;
  onValidateLater: () => void;
};

function toCommercialLines(lines: SyncCaseInvoiceLineInput[]): CommercialLineDraft[] {
  if (lines.length === 0) return [{ ...EMPTY_COMMERCIAL_LINE }];
  return lines.map((l) => ({
    articleId: l.articleId,
    prestationId: l.prestationId,
    description: l.label,
    quantity: l.quantity,
    unitPrice: l.unitPriceHt,
    tvaRate: l.tvaRate,
    unit: l.unit ?? "unité",
  }));
}

function toSyncLines(drafts: CommercialLineDraft[]): SyncCaseInvoiceLineInput[] | null {
  const lines: SyncCaseInvoiceLineInput[] = [];
  for (const d of drafts) {
    const label = d.description.trim();
    if (!label) continue;
    if (!(d.quantity > 0) || d.unitPrice < 0) return null;
    lines.push({
      label,
      quantity: d.quantity,
      unitPriceHt: d.unitPrice,
      tvaRate: d.tvaRate,
      unit: d.unit.trim() || undefined,
      articleId: d.articleId,
      prestationId: d.prestationId,
    });
  }
  return lines.length > 0 ? lines : null;
}

function initialLinesDraft(prefilled: SyncCaseInvoiceLineInput[]): CommercialLineDraft[] {
  return prefilled.length > 0 ? toCommercialLines(prefilled) : [{ ...EMPTY_COMMERCIAL_LINE }];
}

const inputClassName =
  "w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-950 px-3 py-2 text-sm text-slate-900 dark:text-slate-100";

function InvoiceEditorOverlay({
  title,
  eyebrow,
  onClose,
  children,
}: {
  title: string;
  eyebrow: string;
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
            {eyebrow}
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

function InvoicePdfPreview({
  previewUrl,
  loading,
  error,
  emptyHint,
}: {
  previewUrl: string | null;
  loading: boolean;
  error: string | null;
  emptyHint: string;
}) {
  const inlinePdfSupported = useInlinePdfPreviewSupported();

  return (
    <div
      className={`h-full min-h-0 flex flex-col ${
        previewUrl ? "min-h-[40vh] sm:min-h-[45vh]" : "hidden xl:flex"
      }`}
    >
      <div className="shrink-0 flex items-center justify-between gap-2 mb-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Aperçu PDF
        </p>
        <div className="flex items-center gap-2">
          {loading ? <span className="text-[11px] text-slate-400">Mise à jour…</span> : null}
          {previewUrl ? (
            <a
              href={previewUrl}
              target="_blank"
              rel="noreferrer"
              className="rounded-md border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 px-2.5 py-1 text-[11px] font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              Ouvrir
            </a>
          ) : null}
        </div>
      </div>
      <div className="flex-1 min-h-[40vh] xl:min-h-0 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-950 overflow-hidden">
        {previewUrl && inlinePdfSupported ? (
          <iframe
            title="Aperçu de la facture"
            src={previewUrl}
            className="h-full w-full bg-white"
          />
        ) : previewUrl ? (
          <div className="flex h-full min-h-[40vh] flex-col items-center justify-center gap-3 px-6 text-center">
            <p className="text-sm text-slate-600 dark:text-slate-300">
              L&apos;aperçu intégré n&apos;est pas disponible sur cet appareil.
            </p>
            <a
              href={previewUrl}
              target="_blank"
              rel="noreferrer"
              className="rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-500"
            >
              Ouvrir le PDF
            </a>
          </div>
        ) : (
          <div className="flex h-full min-h-0 flex-col items-center justify-center px-6 text-center">
            <p className="text-sm font-medium text-slate-700 dark:text-slate-200">Aperçu PDF</p>
            <p className="mt-2 max-w-sm text-xs text-slate-500 dark:text-slate-400">
              {error ?? emptyHint}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export function CreateCaseInvoiceOverlay({
  open,
  caseId,
  pending,
  finalizePending,
  providerLabel = "Planwise",
  quotes,
  invoices = [],
  initialQuoteId,
  articleUsages = [],
  articles = [],
  prestations = [],
  createdResult = null,
  onClose,
  onSubmit,
  onFinalizeNow,
  onValidateLater,
}: Props) {
  const acceptedQuotes = useMemo(() => quotes.filter((q) => q.status === "accepted"), [quotes]);

  const preferredQuoteId = useMemo(() => {
    if (initialQuoteId && acceptedQuotes.some((q) => q.id === initialQuoteId)) {
      return initialQuoteId;
    }
    return acceptedQuotes[0]?.id ?? "";
  }, [acceptedQuotes, initialQuoteId]);

  const articlesById = useMemo(() => {
    const map = new Map<
      string,
      { defaultPrice?: number | null; name?: string; unit?: string; reference?: string }
    >();
    for (const a of articles) {
      map.set(a.id, {
        defaultPrice: a.defaultPrice,
        name: a.name,
        unit: a.unit,
        reference: a.reference,
      });
    }
    return map;
  }, [articles]);

  const prefilledArticleLines = useMemo(
    () => invoiceLinesFromArticleUsages(articleUsages, articlesById),
    [articleUsages, articlesById],
  );

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

  const hasQuotes = acceptedQuotes.length > 0;
  const hasArticleLines = prefilledArticleLines.length > 0;

  const defaultSource = useMemo((): InvoiceSource => {
    if (initialQuoteId && hasQuotes) return "quote";
    if (hasQuotes) return "quote";
    return "lines";
  }, [initialQuoteId, hasQuotes]);

  const [source, setSource] = useState<InvoiceSource>(defaultSource);
  const [quoteId, setQuoteId] = useState(preferredQuoteId);
  const [invoiceKind, setInvoiceKind] = useState<CaseInvoiceKind>("full");
  const [situationPercent, setSituationPercent] = useState("30");
  const [amountHt, setAmountHt] = useState("");
  const [mode, setMode] = useState<"percent" | "amount">("percent");
  const [lineDrafts, setLineDrafts] = useState<CommercialLineDraft[]>(() =>
    initialLinesDraft(prefilledArticleLines),
  );
  const wasOpenRef = useRef(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const previewUrlRef = useRef<string | null>(null);

  // Réinit uniquement à l’ouverture — pas quand le catalogue articles se rafraîchit
  // (sinon la création rapide d’article efface la ligne sélectionnée).
  useEffect(() => {
    if (!open) {
      wasOpenRef.current = false;
      return;
    }
    if (createdResult) return;
    const justOpened = !wasOpenRef.current;
    wasOpenRef.current = true;
    if (!justOpened) return;

    setSource(defaultSource);
    setQuoteId(preferredQuoteId);
    setInvoiceKind("full");
    setSituationPercent("30");
    setAmountHt("");
    setMode("percent");
    if (defaultSource === "lines") {
      setLineDrafts(initialLinesDraft(prefilledArticleLines));
    }
  }, [open, preferredQuoteId, defaultSource, prefilledArticleLines, createdResult]);

  const selectedQuote = quotes.find((q) => q.id === quoteId);
  const alreadyInvoicedHt = quoteId
    ? quoteInvoicedHt(
        invoices.map((i) => ({
          quoteId: i.quoteId,
          amountHt: i.amountHt,
          remoteStatus: localInvoiceStatusToRemote(i.status),
        })),
        quoteId,
      )
    : 0;
  const remainingHt = selectedQuote
    ? remainingQuoteHt(selectedQuote.totalHt, alreadyInvoicedHt)
    : 0;
  const remainingPct = selectedQuote
    ? remainingQuotePercent(selectedQuote.totalHt, remainingHt)
    : 0;

  const isLinesSource = source === "lines";
  const parsedLines = useMemo(
    () => (isLinesSource ? toSyncLines(lineDrafts) : null),
    [isLinesSource, lineDrafts],
  );
  const linesTotalHt = parsedLines
    ? parsedLines.reduce((s, l) => s + l.quantity * l.unitPriceHt, 0)
    : 0;

  const previewOptions = useMemo((): SyncCaseInvoiceOptions | null => {
    if (isLinesSource) {
      if (!parsedLines || parsedLines.length === 0 || linesTotalHt <= 0) return null;
      return { lines: parsedLines, invoiceKind: "full" };
    }
    if (!quoteId) return null;
    const options: SyncCaseInvoiceOptions = { quoteId, invoiceKind };
    if (invoiceKind === "situation") {
      if (mode === "percent") {
        const pct = Number.parseFloat(situationPercent.replace(",", "."));
        if (!Number.isFinite(pct) || pct <= 0 || pct > 100) return null;
        options.situationPercent = pct;
      } else {
        const amt = Number.parseFloat(amountHt.replace(",", "."));
        if (!Number.isFinite(amt) || amt <= 0) return null;
        options.amountHt = amt;
      }
    }
    if (invoiceKind === "deposit") {
      const amt = Number.parseFloat(amountHt.replace(",", "."));
      if (!Number.isFinite(amt) || amt <= 0) return null;
      options.amountHt = amt;
    }
    return options;
  }, [
    isLinesSource,
    parsedLines,
    linesTotalHt,
    quoteId,
    invoiceKind,
    mode,
    situationPercent,
    amountHt,
  ]);

  const canSubmit = previewOptions != null;

  useEffect(() => {
    if (!open || !caseId) {
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
    const revokeCurrent = () => {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
        previewUrlRef.current = null;
      }
    };

    if (createdResult) {
      setPreviewLoading(true);
      void billingApi
        .previewInvoicePdf(createdResult.id)
        .then((url) => {
          if (cancelled) {
            URL.revokeObjectURL(url);
            return;
          }
          revokeCurrent();
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
      return () => {
        cancelled = true;
      };
    }

    if (!previewOptions) {
      revokeCurrent();
      setPreviewUrl(null);
      setPreviewError(null);
      setPreviewLoading(false);
      return;
    }

    setPreviewLoading(true);
    const timer = window.setTimeout(() => {
      void billingApi
        .previewCaseInvoicePdf(caseId, previewOptions)
        .then((url) => {
          if (cancelled) {
            URL.revokeObjectURL(url);
            return;
          }
          revokeCurrent();
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
  }, [open, caseId, createdResult, previewOptions]);

  useEffect(() => {
    return () => {
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    };
  }, []);

  if (!open) return null;

  const reviewMode = Boolean(createdResult);

  const applySource = (next: InvoiceSource) => {
    setSource(next);
    if (next === "lines") {
      setLineDrafts(initialLinesDraft(prefilledArticleLines));
      setInvoiceKind("full");
    }
  };

  const importTerrainLines = () => {
    setLineDrafts((prev) => {
      const kept = prev.filter((l) => l.description.trim());
      const imported = toCommercialLines(prefilledArticleLines);
      return kept.length > 0 ? [...kept, ...imported] : imported;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!previewOptions) return;
    onSubmit(previewOptions);
  };

  return (
    <InvoiceEditorOverlay
      eyebrow="Facture"
      title={
        reviewMode ? `Brouillon ${providerLabel} créé` : `Brouillon de facture ${providerLabel}`
      }
      onClose={reviewMode ? onValidateLater : onClose}
    >
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 h-full min-h-0">
        <div className="min-w-0 min-h-0 xl:overflow-y-auto">
          {reviewMode && createdResult ? (
            <div className="space-y-5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5">
              <div>
                <p className="text-sm font-medium text-slate-800 dark:text-slate-100">
                  Relisez le brouillon
                </p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  {createdResult.status === "draft"
                    ? "Validez maintenant pour numéroter la facture, ou plus tard depuis le suivi facturation."
                    : "La facture a été émise."}
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                {createdResult.status === "draft" ? (
                  <>
                    <button
                      type="button"
                      disabled={finalizePending}
                      onClick={() => onFinalizeNow(createdResult.id)}
                      className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-500 disabled:opacity-50"
                    >
                      {finalizePending ? "Validation…" : "Valider maintenant"}
                    </button>
                    <button
                      type="button"
                      disabled={finalizePending}
                      onClick={onValidateLater}
                      className="rounded-lg border border-slate-200 dark:border-slate-600 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50"
                    >
                      Valider plus tard
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={onValidateLater}
                    className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-500"
                  >
                    Terminer
                  </button>
                )}
              </div>

              <p className="text-xs text-slate-500 dark:text-slate-400">
                {createdResult.number ?? createdResult.draftNumber ?? "Brouillon"} ·{" "}
                {createdResult.amountHt} € HT
              </p>
            </div>
          ) : (
            <form
              onSubmit={handleSubmit}
              className="space-y-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 sm:p-5"
            >
              <ElectronicInvoicingNotice />
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Relisez l’aperçu PDF, puis créez le brouillon. Validez ensuite pour attribuer un
                numéro définitif.
              </p>

              <fieldset className="space-y-2">
                <legend className="text-sm font-medium text-slate-700 dark:text-slate-200">
                  Source
                </legend>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {(
                    [
                      { id: "quote" as const, label: "Devis", disabled: !hasQuotes },
                      { id: "lines" as const, label: "Saisie libre", disabled: false },
                    ] as const
                  ).map((opt) => (
                    <label
                      key={opt.id}
                      className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${
                        opt.disabled
                          ? "opacity-50 cursor-not-allowed border-slate-200 dark:border-slate-700"
                          : source === opt.id
                            ? "border-brand-500 bg-brand-50 dark:bg-brand-950/40 cursor-pointer"
                            : "border-slate-200 dark:border-slate-600 cursor-pointer"
                      }`}
                    >
                      <input
                        type="radio"
                        name="invoiceSource"
                        value={opt.id}
                        checked={source === opt.id}
                        disabled={opt.disabled}
                        onChange={() => applySource(opt.id)}
                        className="accent-brand-600"
                      />
                      {opt.label}
                    </label>
                  ))}
                </div>
              </fieldset>

              {source === "quote" ? (
                <>
                  <label className="block space-y-1.5">
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                      Devis
                    </span>
                    <select
                      value={quoteId}
                      onChange={(e) => setQuoteId(e.target.value)}
                      className={inputClassName}
                      required
                    >
                      {acceptedQuotes.map((q) => (
                        <option key={q.id} value={q.id}>
                          {q.quoteNumber}
                          {q.subject ? ` — ${q.subject}` : ""} ({q.totalHt.toFixed(2)} € HT)
                        </option>
                      ))}
                    </select>
                    {acceptedQuotes.length === 0 ? (
                      <span className="text-xs text-amber-700 dark:text-amber-300 block">
                        Aucun devis accepté sur ce dossier. Acceptez un devis ou saisissez des
                        lignes libres.
                      </span>
                    ) : null}
                    {selectedQuote ? (
                      <span className="text-xs text-slate-500 dark:text-slate-400 block">
                        Total devis : {selectedQuote.totalHt.toFixed(2)} € HT
                        {alreadyInvoicedHt > 0
                          ? ` · déjà facturé / brouillon : ${alreadyInvoicedHt.toFixed(2)} € HT`
                          : ""}
                        {" · "}
                        reste : {remainingHt.toFixed(2)} € HT ({remainingPct} %)
                      </span>
                    ) : null}
                  </label>

                  <fieldset className="space-y-2">
                    <legend className="text-sm font-medium text-slate-700 dark:text-slate-200">
                      Type
                    </legend>
                    <div className="grid grid-cols-2 gap-2">
                      {CASE_INVOICE_KINDS.map((kind) => (
                        <label
                          key={kind}
                          className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm cursor-pointer ${
                            invoiceKind === kind
                              ? "border-brand-500 bg-brand-50 dark:bg-brand-950/40"
                              : "border-slate-200 dark:border-slate-600"
                          }`}
                        >
                          <input
                            type="radio"
                            name="invoiceKind"
                            value={kind}
                            checked={invoiceKind === kind}
                            onChange={() => setInvoiceKind(kind)}
                            className="accent-brand-600"
                          />
                          {CASE_INVOICE_KIND_LABELS[kind]}
                        </label>
                      ))}
                    </div>
                  </fieldset>

                  {invoiceKind === "situation" ? (
                    <div className="space-y-3">
                      <div className="flex gap-2 text-sm">
                        <button
                          type="button"
                          onClick={() => setMode("percent")}
                          className={`rounded-lg px-3 py-1.5 border ${
                            mode === "percent"
                              ? "border-brand-500 bg-brand-50 dark:bg-brand-950/40"
                              : "border-slate-200 dark:border-slate-600"
                          }`}
                        >
                          Pourcentage
                        </button>
                        <button
                          type="button"
                          onClick={() => setMode("amount")}
                          className={`rounded-lg px-3 py-1.5 border ${
                            mode === "amount"
                              ? "border-brand-500 bg-brand-50 dark:bg-brand-950/40"
                              : "border-slate-200 dark:border-slate-600"
                          }`}
                        >
                          Montant HT
                        </button>
                      </div>
                      {mode === "percent" ? (
                        <label className="block space-y-1.5">
                          <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                            Avancement (%)
                          </span>
                          <input
                            type="number"
                            min={1}
                            max={100}
                            step={0.01}
                            value={situationPercent}
                            onChange={(e) => setSituationPercent(e.target.value)}
                            className={inputClassName}
                            required
                          />
                        </label>
                      ) : (
                        <label className="block space-y-1.5">
                          <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                            Montant HT (€)
                          </span>
                          <input
                            type="number"
                            min={0.01}
                            step={0.01}
                            value={amountHt}
                            onChange={(e) => setAmountHt(e.target.value)}
                            className={inputClassName}
                            required
                          />
                        </label>
                      )}
                    </div>
                  ) : null}

                  {invoiceKind === "deposit" ? (
                    <label className="block space-y-1.5">
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                        Montant d&apos;acompte HT (€)
                      </span>
                      <input
                        type="number"
                        min={0.01}
                        step={0.01}
                        value={amountHt}
                        onChange={(e) => setAmountHt(e.target.value)}
                        className={inputClassName}
                        required
                      />
                    </label>
                  ) : null}

                  {invoiceKind === "balance" ? (
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      Le solde facturera le reste HT du devis non encore couvert par les factures
                      liées.
                    </p>
                  ) : null}
                </>
              ) : (
                <CommercialLinesEditor
                  lines={lineDrafts}
                  onChange={setLineDrafts}
                  catalogItems={catalogItems}
                  secondaryAction={
                    hasArticleLines
                      ? {
                          label: "Pré-remplir depuis les interventions",
                          title:
                            "Ajouter les articles consommés sur les interventions du dossier (prix catalogue)",
                          emphasized: true,
                          onClick: importTerrainLines,
                        }
                      : undefined
                  }
                />
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={pending}
                  className="rounded-lg border border-slate-200 dark:border-slate-600 px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 disabled:opacity-50"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={pending || !canSubmit}
                  className="rounded-lg bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-500 disabled:opacity-50"
                >
                  {pending ? "Création…" : "Créer le brouillon"}
                </button>
              </div>
            </form>
          )}
        </div>

        <div className="min-w-0 min-h-0 xl:h-full">
          <InvoicePdfPreview
            previewUrl={previewUrl}
            loading={previewLoading}
            error={previewError}
            emptyHint="Complétez les lignes ou le devis pour générer l’aperçu PDF."
          />
        </div>
      </div>
    </InvoiceEditorOverlay>
  );
}
