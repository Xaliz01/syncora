"use client";

import { useEffect, useMemo, useState } from "react";

export type ImportPresetItem = {
  id: string;
  name: string;
  description: string;
  category: string;
  /** Ligne secondaire (ex. « 3 étapes · 8 tâches » ou « 12 permissions »). */
  meta?: string;
  /** Déjà présent dans l’organisation (même nom). */
  alreadyExists?: boolean;
};

/**
 * Modale générique : cocher des presets d’un catalogue et importer.
 */
export function ImportDefaultsDialog({
  open,
  onClose,
  title,
  description,
  items,
  confirmLabel = "Importer la sélection",
  importing = false,
  onImport,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description: string;
  items: ImportPresetItem[];
  confirmLabel?: string;
  importing?: boolean;
  onImport: (ids: string[]) => void | Promise<void>;
}) {
  const [selected, setSelected] = useState<string[]>([]);

  useEffect(() => {
    if (open) {
      setSelected(items.filter((i) => !i.alreadyExists).map((i) => i.id));
    }
  }, [open, items]);

  const byCategory = useMemo(() => {
    const map = new Map<string, ImportPresetItem[]>();
    for (const item of items) {
      const list = map.get(item.category) ?? [];
      list.push(item);
      map.set(item.category, list);
    }
    return [...map.entries()];
  }, [items]);

  const selectableIds = items.filter((i) => !i.alreadyExists).map((i) => i.id);
  const allSelected =
    selectableIds.length > 0 && selectableIds.every((id) => selected.includes(id));

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="import-defaults-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
        aria-label="Fermer"
        onClick={onClose}
        disabled={importing}
      />
      <div className="relative flex w-full max-w-lg max-h-[min(90vh,40rem)] flex-col rounded-2xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900">
        <div className="border-b border-slate-200 px-5 py-4 dark:border-slate-800 sm:px-6">
          <h2
            id="import-defaults-title"
            className="text-lg font-semibold text-slate-900 dark:text-slate-100"
          >
            {title}
          </h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{description}</p>
          {selectableIds.length > 0 ? (
            <button
              type="button"
              className="mt-3 text-xs font-medium text-brand-600 hover:underline"
              onClick={() => setSelected(allSelected ? [] : selectableIds)}
            >
              {allSelected ? "Tout désélectionner" : "Tout sélectionner"}
            </button>
          ) : null}
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-3 sm:px-6">
          {byCategory.map(([category, catItems]) => (
            <div key={category} className="mb-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                {category}
              </p>
              <ul className="space-y-2">
                {catItems.map((item) => {
                  const disabled = !!item.alreadyExists;
                  const checked = selected.includes(item.id) || disabled;
                  return (
                    <li key={item.id}>
                      <label
                        className={`flex cursor-pointer gap-3 rounded-xl border px-3 py-2.5 ${
                          disabled
                            ? "border-slate-100 bg-slate-50 opacity-70 dark:border-slate-800 dark:bg-slate-950/50"
                            : checked
                              ? "border-brand-500/40 bg-brand-50/50 dark:border-brand-500/30 dark:bg-brand-950/20"
                              : "border-slate-200 dark:border-slate-700"
                        }`}
                      >
                        <input
                          type="checkbox"
                          className="mt-1"
                          disabled={disabled || importing}
                          checked={checked}
                          onChange={() => {
                            if (disabled) return;
                            setSelected((prev) =>
                              prev.includes(item.id)
                                ? prev.filter((id) => id !== item.id)
                                : [...prev, item.id],
                            );
                          }}
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-medium text-slate-900 dark:text-slate-100">
                            {item.name}
                            {disabled ? (
                              <span className="ml-2 text-xs font-normal text-slate-400">
                                (déjà présent)
                              </span>
                            ) : null}
                          </span>
                          <span className="mt-0.5 block text-xs text-slate-500 dark:text-slate-400">
                            {item.description}
                          </span>
                          {item.meta ? (
                            <span className="mt-0.5 block text-[11px] text-slate-400">
                              {item.meta}
                            </span>
                          ) : null}
                        </span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-200 px-5 py-3 dark:border-slate-800 sm:px-6">
          <button
            type="button"
            onClick={onClose}
            disabled={importing}
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm dark:border-slate-700"
          >
            Annuler
          </button>
          <button
            type="button"
            disabled={importing || selected.length === 0}
            onClick={() => void onImport(selected)}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-500 disabled:opacity-50"
          >
            {importing ? "Import…" : `${confirmLabel} (${selected.length})`}
          </button>
        </div>
      </div>
    </div>
  );
}
