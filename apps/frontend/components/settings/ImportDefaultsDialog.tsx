"use client";

import { useEffect, useMemo, useState } from "react";
import {
  FormDialog,
  FormDialogCancelButton,
  FormDialogPrimaryButton,
} from "@/components/ui/FormDialog";

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

  return (
    <FormDialog
      open={open}
      onClose={onClose}
      closeDisabled={importing}
      title={title}
      description={description}
      titleId="import-defaults-title"
      size="md"
      zClassName="z-50"
      headerExtra={
        selectableIds.length > 0 ? (
          <button
            type="button"
            className="mt-3 text-xs font-medium text-brand-600 hover:underline"
            onClick={() => setSelected(allSelected ? [] : selectableIds)}
          >
            {allSelected ? "Tout désélectionner" : "Tout sélectionner"}
          </button>
        ) : null
      }
      footer={
        <>
          <FormDialogCancelButton onClick={onClose} disabled={importing} />
          <FormDialogPrimaryButton
            disabled={importing || selected.length === 0}
            onClick={() => void onImport(selected)}
          >
            {importing ? "Import…" : `${confirmLabel} (${selected.length})`}
          </FormDialogPrimaryButton>
        </>
      }
    >
      {byCategory.map(([category, catItems]) => (
        <div key={category} className="mb-4 last:mb-0">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
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
                        <span className="mt-0.5 block text-[11px] text-slate-400">{item.meta}</span>
                      ) : null}
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </FormDialog>
  );
}
