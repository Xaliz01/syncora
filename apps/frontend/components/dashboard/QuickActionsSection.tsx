"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  DEFAULT_QUICK_ACTION_IDS,
  MAX_QUICK_ACTIONS,
  MIN_QUICK_ACTIONS,
  QUICK_ACTION_CATALOG,
  resolveQuickActions,
  type QuickActionId,
} from "@planwise/shared";
import { useAuth } from "@/components/auth/AuthContext";
import { hasPermission } from "@/lib/auth-permissions";
import { useToast } from "@/components/ui/ToastProvider";
import * as accountApi from "@/lib/account.api";

function useBodyScrollLock(locked: boolean) {
  useEffect(() => {
    if (!locked) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [locked]);
}

function CustomizeQuickActionsDialog({
  open,
  initialIds,
  availableIds,
  onClose,
  onSave,
  isSaving,
}: {
  open: boolean;
  initialIds: QuickActionId[];
  availableIds: QuickActionId[];
  onClose: () => void;
  onSave: (ids: QuickActionId[]) => void;
  isSaving: boolean;
}) {
  const [selected, setSelected] = useState<QuickActionId[]>(initialIds);
  useBodyScrollLock(open);

  useEffect(() => {
    if (open) setSelected(initialIds);
  }, [open, initialIds]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const availableDefs = QUICK_ACTION_CATALOG.filter((a) => availableIds.includes(a.id));
  const canSave =
    selected.length >= MIN_QUICK_ACTIONS &&
    selected.length <= MAX_QUICK_ACTIONS &&
    selected.every((id) => availableIds.includes(id));

  const toggle = (id: QuickActionId) => {
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= MAX_QUICK_ACTIONS) return prev;
      return [...prev, id];
    });
  };

  const move = (index: number, direction: -1 | 1) => {
    setSelected((prev) => {
      const next = [...prev];
      const target = index + direction;
      if (target < 0 || target >= next.length) return prev;
      const tmp = next[index]!;
      next[index] = next[target]!;
      next[target] = tmp;
      return next;
    });
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-[3px]"
        aria-label="Fermer"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="quick-actions-dialog-title"
        className="relative w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-2xl"
      >
        <div className="shrink-0 border-b border-slate-200 dark:border-slate-700 px-5 py-4">
          <h2
            id="quick-actions-dialog-title"
            className="text-lg font-semibold text-slate-900 dark:text-slate-100"
          >
            Personnaliser les actions rapides
          </h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Choisissez entre {MIN_QUICK_ACTIONS} et {MAX_QUICK_ACTIONS} raccourcis. Le premier est
            mis en avant.
          </p>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-2">
              Sélection ({selected.length}/{MAX_QUICK_ACTIONS})
            </h3>
            <ul className="space-y-1.5">
              {availableDefs.map((action) => {
                const checked = selected.includes(action.id);
                const disabled = !checked && selected.length >= MAX_QUICK_ACTIONS;
                return (
                  <li key={action.id}>
                    <label
                      className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 text-sm transition ${
                        checked
                          ? "border-brand-500 bg-brand-50/60 dark:bg-brand-950/30"
                          : "border-slate-200 dark:border-slate-700"
                      } ${disabled ? "opacity-50" : "cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/60"}`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={disabled}
                        onChange={() => toggle(action.id)}
                        className="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                      />
                      <span className="text-slate-800 dark:text-slate-100">{action.label}</span>
                    </label>
                  </li>
                );
              })}
            </ul>
          </div>

          {selected.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-2">
                Ordre d&apos;affichage
              </h3>
              <ul className="space-y-1.5">
                {selected.map((id, index) => {
                  const def = QUICK_ACTION_CATALOG.find((a) => a.id === id);
                  if (!def) return null;
                  return (
                    <li
                      key={id}
                      className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2"
                    >
                      <span className="text-sm text-slate-800 dark:text-slate-100">
                        {index === 0 ? (
                          <span className="mr-2 text-[10px] font-semibold uppercase text-brand-600 dark:text-brand-400">
                            Principal
                          </span>
                        ) : null}
                        {def.label}
                      </span>
                      <div className="flex gap-1">
                        <button
                          type="button"
                          aria-label="Monter"
                          disabled={index === 0}
                          onClick={() => move(index, -1)}
                          className="rounded border border-slate-200 dark:border-slate-600 px-2 py-0.5 text-xs disabled:opacity-40"
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          aria-label="Descendre"
                          disabled={index === selected.length - 1}
                          onClick={() => move(index, 1)}
                          className="rounded border border-slate-200 dark:border-slate-600 px-2 py-0.5 text-xs disabled:opacity-40"
                        >
                          ↓
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>

        <div className="shrink-0 flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 dark:border-slate-700 px-5 py-3">
          <button
            type="button"
            onClick={() => {
              const defaults = DEFAULT_QUICK_ACTION_IDS.filter((id) =>
                availableIds.includes(id),
              ) as QuickActionId[];
              const padded = [...defaults];
              for (const id of availableIds) {
                if (!padded.includes(id)) padded.push(id);
                if (padded.length >= MIN_QUICK_ACTIONS) break;
              }
              setSelected(padded.slice(0, MAX_QUICK_ACTIONS));
            }}
            className="text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
          >
            Réinitialiser
          </button>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-200 dark:border-slate-600 px-3 py-1.5 text-sm text-slate-700 dark:text-slate-200"
            >
              Annuler
            </button>
            <button
              type="button"
              disabled={!canSave || isSaving}
              onClick={() => onSave(selected)}
              className="rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-500 disabled:opacity-50"
            >
              {isSaving ? "Enregistrement…" : "Enregistrer"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function QuickActionsSection() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);

  const can = (code: Parameters<typeof hasPermission>[1]) => hasPermission(user, code);

  const availableIds = useMemo(
    () => QUICK_ACTION_CATALOG.filter((a) => can(a.permission)).map((a) => a.id),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- can depends on user
    [user],
  );

  const { data: prefsData } = useQuery({
    queryKey: ["account-preferences"],
    queryFn: () => accountApi.getPreferences(),
    staleTime: 60_000,
    enabled: !!user,
  });

  const selectedIds =
    prefsData?.preferences.quickActionIds ?? ([...DEFAULT_QUICK_ACTION_IDS] as QuickActionId[]);

  const actions = useMemo(
    () => resolveQuickActions(selectedIds, can),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selectedIds, user],
  );

  const saveMutation = useMutation({
    mutationFn: (quickActionIds: QuickActionId[]) =>
      accountApi.updatePreferences({ quickActionIds }),
    onSuccess: (res) => {
      queryClient.setQueryData(["account-preferences"], res);
      setDialogOpen(false);
      showToast("Actions rapides mises à jour", "success");
    },
    onError: (err: Error) => showToast(err.message || "Erreur", "error"),
  });

  const canCustomize = availableIds.length >= MIN_QUICK_ACTIONS;

  if (!user) return null;
  if (actions.length === 0 && !canCustomize) return null;

  const dialogInitialIds = (
    selectedIds.length >= MIN_QUICK_ACTIONS
      ? selectedIds.filter((id) => availableIds.includes(id))
      : DEFAULT_QUICK_ACTION_IDS.filter((id) => availableIds.includes(id))
  ) as QuickActionId[];

  // If reset leaves fewer than min, pad with first available
  const ensureMin = (ids: QuickActionId[]): QuickActionId[] => {
    if (ids.length >= MIN_QUICK_ACTIONS) return ids.slice(0, MAX_QUICK_ACTIONS);
    const padded = [...ids];
    for (const id of availableIds) {
      if (!padded.includes(id)) padded.push(id);
      if (padded.length >= MIN_QUICK_ACTIONS) break;
    }
    return padded.slice(0, MAX_QUICK_ACTIONS);
  };

  return (
    <>
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 shadow-sm dark:shadow-slate-950/20">
        <div className="flex items-center justify-between gap-3 mb-3">
          <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100">
            Actions rapides
          </h2>
          {canCustomize && (
            <button
              type="button"
              onClick={() => setDialogOpen(true)}
              className="text-xs font-medium text-brand-600 dark:text-brand-400 hover:text-brand-500 transition"
            >
              Personnaliser
            </button>
          )}
        </div>
        {actions.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {actions.map((action, index) => (
              <Link
                key={action.id}
                href={action.href}
                className={
                  index === 0
                    ? "rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-500 transition"
                    : "rounded-lg border border-slate-200 dark:border-slate-700 px-4 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                }
              >
                {action.label}
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Aucune action disponible avec vos droits actuels.{" "}
            {canCustomize ? "Personnalisez la liste pour en choisir d’autres." : null}
          </p>
        )}
      </div>

      <CustomizeQuickActionsDialog
        open={dialogOpen}
        initialIds={ensureMin(dialogInitialIds)}
        availableIds={availableIds}
        onClose={() => setDialogOpen(false)}
        onSave={(ids) => saveMutation.mutate(ids)}
        isSaving={saveMutation.isPending}
      />
    </>
  );
}
