"use client";

import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { ArticleResponse } from "@planwise/shared";
import * as stockApi from "@/lib/stock.api";
import { suggestCatalogReference } from "@/lib/catalog-reference";

type Props = {
  initialName?: string;
  initialUnitPrice?: number;
  initialUnit?: string;
  onSuccess: (article: ArticleResponse) => void;
  onCancel: () => void;
};

export function ArticleQuickCreateForm({
  initialName = "",
  initialUnitPrice = 0,
  initialUnit = "unité",
  onSuccess,
  onCancel,
}: Props) {
  const queryClient = useQueryClient();
  const [name, setName] = useState(initialName);
  const [reference, setReference] = useState(() => suggestCatalogReference(initialName, "ART"));
  const [referenceTouched, setReferenceTouched] = useState(false);
  const [unit, setUnit] = useState(initialUnit || "unité");
  const [defaultPrice, setDefaultPrice] = useState(
    initialUnitPrice > 0 ? String(initialUnitPrice) : "",
  );
  const [error, setError] = useState("");

  useEffect(() => {
    if (!referenceTouched) {
      setReference(suggestCatalogReference(name, "ART"));
    }
  }, [name, referenceTouched]);

  const createMutation = useMutation({
    mutationFn: () =>
      stockApi.createArticle({
        name: name.trim(),
        reference: reference.trim(),
        unit: unit.trim() || "unité",
        defaultPrice: Number(String(defaultPrice).replace(",", ".")) || undefined,
        initialStock: 0,
      }),
    onSuccess: (article) => {
      void queryClient.invalidateQueries({ queryKey: ["articles"] });
      void queryClient.invalidateQueries({ queryKey: ["stock-articles-for-quotes"] });
      onSuccess(article);
    },
    onError: (err: unknown) => {
      setError(err instanceof Error ? err.message : "Création impossible");
    },
  });

  const canSubmit = name.trim().length > 0 && reference.trim().length > 0;

  const submit = () => {
    if (!canSubmit || createMutation.isPending) return;
    setError("");
    createMutation.mutate();
  };

  return (
    <div
      className="space-y-2 rounded-md border border-brand-200 dark:border-brand-800 bg-brand-50/40 dark:bg-brand-950/30 p-2"
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          e.stopPropagation();
          submit();
        }
      }}
    >
      <p className="text-[11px] font-semibold text-brand-800 dark:text-brand-200">Nouvel article</p>
      {error ? <p className="text-[11px] text-red-600 dark:text-red-400">{error}</p> : null}
      <div className="grid grid-cols-2 gap-1.5">
        <label className="col-span-2 block space-y-0.5">
          <span className="text-[10px] text-slate-500 dark:text-slate-400">Nom</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
            className="w-full rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1 text-xs focus:border-brand-500 focus:outline-none"
          />
        </label>
        <label className="block space-y-0.5">
          <span className="text-[10px] text-slate-500 dark:text-slate-400">Référence</span>
          <input
            value={reference}
            onChange={(e) => {
              setReferenceTouched(true);
              setReference(e.target.value.toUpperCase());
            }}
            className="w-full rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1 text-xs focus:border-brand-500 focus:outline-none"
          />
        </label>
        <label className="block space-y-0.5">
          <span className="text-[10px] text-slate-500 dark:text-slate-400">Prix HT (€)</span>
          <input
            type="number"
            min={0}
            step={0.01}
            value={defaultPrice}
            onChange={(e) => setDefaultPrice(e.target.value)}
            className="w-full rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1 text-xs focus:border-brand-500 focus:outline-none"
          />
        </label>
        <label className="col-span-2 block space-y-0.5">
          <span className="text-[10px] text-slate-500 dark:text-slate-400">Unité</span>
          <input
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            className="w-full rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1 text-xs focus:border-brand-500 focus:outline-none"
          />
        </label>
      </div>
      <p className="text-[10px] text-slate-500 dark:text-slate-400">
        Stock initial à 0 — ajustable ensuite dans le stock.
      </p>
      <div className="flex flex-wrap gap-1.5 pt-0.5">
        <button
          type="button"
          disabled={!canSubmit || createMutation.isPending}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            submit();
          }}
          className="rounded-md bg-brand-600 px-2.5 py-1 text-[11px] font-medium text-white hover:bg-brand-500 disabled:opacity-50"
        >
          {createMutation.isPending ? "Création…" : "Créer et sélectionner"}
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onCancel();
          }}
          className="rounded-md border border-slate-200 dark:border-slate-700 px-2.5 py-1 text-[11px] text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
        >
          Annuler
        </button>
      </div>
    </div>
  );
}
