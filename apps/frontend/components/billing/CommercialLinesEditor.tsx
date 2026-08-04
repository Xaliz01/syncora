"use client";

import { useEffect, useRef, useState } from "react";
import type { ArticleResponse, PrestationResponse, TvaRate } from "@planwise/shared";
import { TVA_RATES } from "@planwise/shared";
import { usePermissions } from "@/lib/hooks/usePermissions";
import { PrestationQuickCreateForm } from "@/components/prestations/PrestationQuickCreateForm";
import { ArticleQuickCreateForm } from "@/components/stock/ArticleQuickCreateForm";

export type CatalogPickKind = "article" | "prestation";

/** Entrée unifiée pour l’autocomplete (articles stock + prestations). */
export type CatalogPickItem = {
  id: string;
  kind: CatalogPickKind;
  name: string;
  reference: string;
  unit: string;
  defaultPrice?: number;
  defaultTvaRate?: TvaRate;
};

export type CommercialLineDraft = {
  articleId?: string;
  prestationId?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  tvaRate: TvaRate;
  unit: string;
};

export const EMPTY_COMMERCIAL_LINE: CommercialLineDraft = {
  description: "",
  quantity: 1,
  unitPrice: 0,
  tvaRate: 20,
  unit: "unité",
};

export function formatCommercialCurrency(value: number): string {
  return value.toLocaleString("fr-FR", {
    style: "currency",
    currency: "EUR",
  });
}

const KIND_LABELS: Record<CatalogPickKind, string> = {
  article: "Article",
  prestation: "Prestation",
};

type QuickCreateKind = CatalogPickKind | null;

function prestationToCatalogItem(p: PrestationResponse): CatalogPickItem {
  return {
    id: p.id,
    kind: "prestation",
    name: p.name,
    reference: p.reference,
    unit: p.unit,
    defaultPrice: p.defaultPrice,
    defaultTvaRate: p.defaultTvaRate,
  };
}

function articleToCatalogItem(a: ArticleResponse): CatalogPickItem {
  return {
    id: a.id,
    kind: "article",
    name: a.name,
    reference: a.reference,
    unit: a.unit,
    defaultPrice: a.defaultPrice,
    defaultTvaRate: 20,
  };
}

export function CatalogAutocomplete({
  value,
  items,
  onSelect,
  onChange,
  lineHints,
}: {
  value: string;
  items: CatalogPickItem[];
  onSelect: (item: CatalogPickItem) => void;
  onChange: (value: string) => void;
  /** Valeurs de la ligne courante pour préremplir la création rapide. */
  lineHints?: {
    unitPrice?: number;
    tvaRate?: TvaRate;
    unit?: string;
  };
}) {
  const { can } = usePermissions();
  const canCreatePrestation = can("prestations.create");
  const canCreateArticle = can("stock.articles.create");
  const canQuickCreate = canCreatePrestation || canCreateArticle;
  const [open, setOpen] = useState(false);
  const [showCreate, setShowCreate] = useState<QuickCreateKind>(null);
  const [search, setSearch] = useState("");
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
        setShowCreate(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filtered = items.filter(
    (a) =>
      a.name.toLowerCase().includes(search.toLowerCase()) ||
      a.reference.toLowerCase().includes(search.toLowerCase()),
  );

  const showDropdown = open && (showCreate != null || filtered.length > 0 || canQuickCreate);
  const seedName = search.trim() || value.trim();

  return (
    <div ref={wrapperRef} className="relative">
      <input
        type="text"
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setSearch(e.target.value);
          setShowCreate(null);
          setOpen(true);
        }}
        onFocus={() => {
          setSearch(value);
          setOpen(true);
        }}
        placeholder="Prestation ou article du stock"
        className="w-full rounded-md border border-slate-200 dark:border-slate-700 px-2 py-1.5 text-xs focus:border-brand-500 focus:outline-none"
      />
      {showDropdown ? (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-lg">
          {showCreate === "prestation" ? (
            <div className="p-1.5">
              <PrestationQuickCreateForm
                initialName={seedName}
                initialUnitPrice={lineHints?.unitPrice}
                initialTvaRate={lineHints?.tvaRate}
                initialUnit={lineHints?.unit}
                onCancel={() => setShowCreate(null)}
                onSuccess={(prestation) => {
                  onSelect(prestationToCatalogItem(prestation));
                  setShowCreate(null);
                  setOpen(false);
                }}
              />
            </div>
          ) : showCreate === "article" ? (
            <div className="p-1.5">
              <ArticleQuickCreateForm
                initialName={seedName}
                initialUnitPrice={lineHints?.unitPrice}
                initialUnit={lineHints?.unit}
                onCancel={() => setShowCreate(null)}
                onSuccess={(article) => {
                  onSelect(articleToCatalogItem(article));
                  setShowCreate(null);
                  setOpen(false);
                }}
              />
            </div>
          ) : (
            <>
              {filtered.length > 0 ? (
                <div className="max-h-40 overflow-y-auto">
                  {filtered.slice(0, 12).map((item) => (
                    <button
                      key={`${item.kind}-${item.id}`}
                      type="button"
                      className="w-full text-left px-2 py-1.5 text-xs hover:bg-slate-50 dark:hover:bg-slate-800 border-b border-slate-100 dark:border-slate-800 last:border-0"
                      onClick={() => {
                        onSelect(item);
                        setOpen(false);
                      }}
                    >
                      <span className="mr-2 rounded bg-slate-100 dark:bg-slate-800 px-1 py-0.5 text-[10px] font-medium text-slate-500 dark:text-slate-400">
                        {KIND_LABELS[item.kind]}
                      </span>
                      <span className="font-medium text-slate-700 dark:text-slate-200">
                        {item.name}
                      </span>
                      <span className="ml-2 text-slate-400">[{item.reference}]</span>
                      {item.defaultPrice !== undefined && (
                        <span className="ml-2 text-brand-600 dark:text-brand-400">
                          {item.defaultPrice.toLocaleString("fr-FR", {
                            minimumFractionDigits: 2,
                          })}{" "}
                          €
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="px-2 py-2 text-[11px] text-slate-500 dark:text-slate-400">
                  Aucun résultat dans le catalogue.
                </p>
              )}
              {canQuickCreate ? (
                <div className="border-t border-slate-100 dark:border-slate-800 p-1.5 space-y-0.5">
                  {canCreatePrestation ? (
                    <button
                      type="button"
                      onClick={() => setShowCreate("prestation")}
                      className="w-full rounded-md px-2 py-1.5 text-left text-[11px] font-medium text-brand-700 dark:text-brand-300 hover:bg-brand-50 dark:hover:bg-brand-950/40"
                    >
                      + Créer une prestation
                      {seedName ? ` « ${seedName} »` : ""}
                    </button>
                  ) : null}
                  {canCreateArticle ? (
                    <button
                      type="button"
                      onClick={() => setShowCreate("article")}
                      className="w-full rounded-md px-2 py-1.5 text-left text-[11px] font-medium text-brand-700 dark:text-brand-300 hover:bg-brand-50 dark:hover:bg-brand-950/40"
                    >
                      + Créer un article
                      {seedName ? ` « ${seedName} »` : ""}
                    </button>
                  ) : null}
                </div>
              ) : null}
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}

/** @deprecated Prefer CatalogAutocomplete — kept as alias for clarity. */
export const ArticleAutocomplete = CatalogAutocomplete;

type CommercialLinesEditorProps = {
  lines: CommercialLineDraft[];
  onChange: (lines: CommercialLineDraft[]) => void;
  /** Catalogue unifié (articles + prestations). */
  catalogItems: CatalogPickItem[];
  /** Action optionnelle à gauche de « Ajouter une ligne » (ex. import terrain). */
  secondaryAction?: {
    label: string;
    pendingLabel?: string;
    pending?: boolean;
    title?: string;
    /** Bouton plus visible (bordure) plutôt qu’un simple lien texte. */
    emphasized?: boolean;
    onClick: () => void;
  };
};

export function CommercialLinesEditor({
  lines,
  onChange,
  catalogItems,
  secondaryAction,
}: CommercialLinesEditorProps) {
  const updateLine = (idx: number, patch: Partial<CommercialLineDraft>) => {
    onChange(lines.map((l, i) => (i === idx ? { ...l, ...patch } : l)));
  };

  const removeLine = (idx: number) => {
    onChange(lines.filter((_, i) => i !== idx));
  };

  const selectCatalogItem = (idx: number, item: CatalogPickItem) => {
    updateLine(idx, {
      articleId: item.kind === "article" ? item.id : undefined,
      prestationId: item.kind === "prestation" ? item.id : undefined,
      description: item.name,
      unitPrice: item.defaultPrice ?? 0,
      unit: item.unit || "unité",
      tvaRate: item.defaultTvaRate ?? 20,
    });
  };

  const totalHt = lines.reduce((s, l) => s + l.quantity * l.unitPrice, 0);
  const totalTtc = lines.reduce((s, l) => s + l.quantity * l.unitPrice * (1 + l.tvaRate / 100), 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-2 gap-2 flex-wrap">
        <h4 className="text-xs font-semibold text-slate-700 dark:text-slate-200 uppercase tracking-wide">
          Lignes
        </h4>
        <div className="flex items-center gap-2">
          {secondaryAction ? (
            <button
              type="button"
              onClick={secondaryAction.onClick}
              disabled={secondaryAction.pending}
              title={secondaryAction.title}
              className={
                secondaryAction.emphasized
                  ? "rounded-md border border-brand-300 dark:border-brand-700 bg-brand-50 dark:bg-brand-950/40 px-2.5 py-1 text-[11px] font-semibold text-brand-700 dark:text-brand-300 hover:bg-brand-100 dark:hover:bg-brand-900/50 disabled:opacity-50"
                  : "text-[11px] text-slate-600 dark:text-slate-300 hover:text-brand-600 font-medium disabled:opacity-50"
              }
            >
              {secondaryAction.pending
                ? (secondaryAction.pendingLabel ?? "…")
                : secondaryAction.label}
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => onChange([...lines, { ...EMPTY_COMMERCIAL_LINE }])}
            className="text-[11px] text-brand-600 dark:text-brand-400 hover:text-brand-500 font-medium"
          >
            + Ajouter une ligne
          </button>
        </div>
      </div>

      <div className="space-y-2">
        {lines.map((line, idx) => (
          <div
            key={idx}
            className="grid grid-cols-[minmax(0,1fr)_64px_88px_72px_56px_28px] gap-1.5 items-end"
          >
            <div>
              {idx === 0 && (
                <span className="text-[10px] text-slate-500 dark:text-slate-400">Description</span>
              )}
              <CatalogAutocomplete
                value={line.description}
                items={catalogItems}
                lineHints={{
                  unitPrice: line.unitPrice,
                  tvaRate: line.tvaRate,
                  unit: line.unit,
                }}
                onSelect={(item) => selectCatalogItem(idx, item)}
                onChange={(val) =>
                  updateLine(idx, {
                    description: val,
                    articleId: undefined,
                    prestationId: undefined,
                  })
                }
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
            <div className="text-right text-[11px] font-medium text-slate-700 dark:text-slate-200 py-1.5">
              {formatCommercialCurrency(Math.round(line.quantity * line.unitPrice * 100) / 100)}
            </div>
            <div>
              <button
                type="button"
                onClick={() => removeLine(idx)}
                disabled={lines.length <= 1}
                className="text-slate-400 hover:text-red-500 disabled:opacity-30 p-1"
                aria-label="Retirer la ligne"
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

      <div className="flex justify-end gap-6 text-sm border-t border-slate-200 dark:border-slate-700 pt-3 mt-3">
        <div className="text-slate-500 dark:text-slate-400">
          Total HT :{" "}
          <span className="font-semibold text-slate-800 dark:text-slate-100">
            {formatCommercialCurrency(totalHt)}
          </span>
        </div>
        <div className="text-slate-500 dark:text-slate-400">
          Total TTC :{" "}
          <span className="font-semibold text-slate-800 dark:text-slate-100">
            {formatCommercialCurrency(totalTtc)}
          </span>
        </div>
      </div>
    </div>
  );
}
