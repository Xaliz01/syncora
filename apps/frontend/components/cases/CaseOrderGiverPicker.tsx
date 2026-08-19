"use client";

import React, { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import * as orderGiversApi from "@/lib/order-givers.api";
import type { OrderGiverResponse } from "@planwise/shared";
import { MAX_PAGE_LIMIT } from "@planwise/shared";
import { OrderGiverCreateForm } from "@/components/order-givers/OrderGiverCreateForm";
import { CUSTOMER_KIND_LABELS } from "@/components/customers/customer-kind-labels";
import {
  FormDialogCancelButton,
  FormDialogPrimaryButton,
  formFieldHintClassName,
  formFieldLabelClassName,
} from "@/components/ui/FormDialog";
import { FormSidePanel } from "@/components/ui/FormSidePanel";

const CREATE_ORDER_GIVER_FORM_ID = "case-picker-create-order-giver";

export function CaseOrderGiverPicker({
  value,
  initialDisplayName,
  onChange,
  disabled,
  idPrefix = "case-order-giver",
  helpText = "Si renseigné, c'est lui qui sera facturé à la place du client.",
}: {
  value: string;
  /** Libellé affiché quand le parent connaît déjà le donneur d'ordre (ex. fiche dossier) */
  initialDisplayName?: string;
  onChange: (orderGiverId: string) => void;
  disabled?: boolean;
  idPrefix?: string;
  helpText?: string;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [displayLabel, setDisplayLabel] = useState(initialDisplayName ?? "");
  const [createOpen, setCreateOpen] = useState(false);
  const [createPending, setCreatePending] = useState(false);
  const [createKey, setCreateKey] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  // Ne pas réappliquer initialDisplayName quand value change (création à la volée /
  // sélection liste) — sinon le libellé revient à l’entité chargée au départ.
  useEffect(() => {
    if (!value) setDisplayLabel("");
  }, [value]);

  useEffect(() => {
    if (!initialDisplayName) return;
    setDisplayLabel((current) => current || initialDisplayName);
  }, [initialDisplayName]);

  const listEnabled = open && (debounced.length === 0 || debounced.length >= 2);

  const { data: listData, isFetching } = useQuery({
    queryKey: ["order-givers", "list", debounced],
    queryFn: () =>
      orderGiversApi.listOrderGivers({
        search: debounced || undefined,
        limit: MAX_PAGE_LIMIT,
      }),
    enabled: listEnabled,
    staleTime: 20_000,
  });
  const list = listData?.orderGivers ?? [];

  const selectOrderGiver = (og: OrderGiverResponse) => {
    onChange(og.id);
    setDisplayLabel(og.displayName);
    setOpen(false);
    setSearch("");
  };

  const clearSelection = () => {
    onChange("");
    setDisplayLabel("");
    setSearch("");
    setOpen(false);
  };

  const openCreatePanel = () => {
    setOpen(false);
    setSearch("");
    setCreatePending(false);
    setCreateKey((k) => k + 1);
    setCreateOpen(true);
  };

  return (
    <div className="space-y-1">
      <label htmlFor={`${idPrefix}-trigger`} className={formFieldLabelClassName}>
        Donneur d&apos;ordre (optionnel)
      </label>
      <p className={formFieldHintClassName}>{helpText}</p>

      <div className="relative">
        <button
          id={`${idPrefix}-trigger`}
          type="button"
          disabled={disabled}
          onClick={() => {
            if (disabled) return;
            setOpen((o) => !o);
          }}
          className="mt-1 flex w-full items-center justify-between gap-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-950 px-3 py-2 text-left text-sm text-slate-800 dark:text-slate-100 hover:border-slate-300 dark:hover:border-slate-500 disabled:opacity-50"
        >
          <span
            className={
              displayLabel
                ? "text-slate-800 dark:text-slate-100"
                : "text-slate-400 dark:text-slate-500"
            }
          >
            {displayLabel || "Choisir un donneur d'ordre…"}
          </span>
          <span className="text-xs text-slate-400 dark:text-slate-500">{open ? "▲" : "▼"}</span>
        </button>

        {open && !disabled && (
          <div className="absolute z-50 mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-lg">
            <div className="p-2">
              <input
                type="search"
                autoFocus
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher (min. 2 caractères) ou laisser vide pour les récents"
                className="w-full rounded-md border border-slate-200 dark:border-slate-700 px-2 py-1.5 text-sm focus:border-brand-500 focus:outline-none"
              />
              {debounced.length === 1 && (
                <p className="mt-2 px-1 text-xs text-slate-500 dark:text-slate-400">
                  Saisissez au moins 2 caractères pour filtrer.
                </p>
              )}
              <div className="mt-2 max-h-48 overflow-y-auto">
                {isFetching && (
                  <div className="px-2 py-2 text-xs text-slate-500 dark:text-slate-400">
                    Chargement…
                  </div>
                )}
                {!isFetching &&
                  list.map((og) => (
                    <button
                      key={og.id}
                      type="button"
                      onClick={() => selectOrderGiver(og)}
                      className="flex w-full flex-col items-start rounded-md px-2 py-2 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-800"
                    >
                      <span className="font-medium text-slate-800 dark:text-slate-100">
                        {og.displayName}
                      </span>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400">
                        {CUSTOMER_KIND_LABELS[og.kind]}
                        {og.email ? ` · ${og.email}` : ""}
                      </span>
                    </button>
                  ))}
                {!isFetching && list.length === 0 && debounced.length !== 1 && (
                  <p className="px-2 py-2 text-xs text-slate-500 dark:text-slate-400">
                    Aucun donneur d&apos;ordre trouvé.
                  </p>
                )}
              </div>
              <div className="mt-2 flex flex-wrap gap-2 border-t border-slate-100 dark:border-slate-800 pt-2">
                <button
                  type="button"
                  onClick={openCreatePanel}
                  className="rounded-md bg-brand-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-brand-500"
                >
                  Nouveau donneur d&apos;ordre
                </button>
                {value && (
                  <button
                    type="button"
                    onClick={clearSelection}
                    className="rounded-md border border-slate-200 dark:border-slate-700 px-2.5 py-1.5 text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                  >
                    Retirer le donneur d&apos;ordre
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="ml-auto rounded-md px-2.5 py-1.5 text-xs text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  Fermer
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <FormSidePanel
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Nouveau donneur d'ordre"
        description="Le donneur d'ordre sera créé puis sélectionné sur le dossier."
        widthClassName="max-w-xl"
        closeDisabled={createPending}
        footer={
          <>
            <FormDialogCancelButton onClick={() => setCreateOpen(false)} disabled={createPending} />
            <FormDialogPrimaryButton
              type="submit"
              form={CREATE_ORDER_GIVER_FORM_ID}
              disabled={createPending}
            >
              {createPending ? "Création…" : "Créer et sélectionner"}
            </FormDialogPrimaryButton>
          </>
        }
      >
        <OrderGiverCreateForm
          key={createKey}
          formId={CREATE_ORDER_GIVER_FORM_ID}
          hideActions
          submitLabel="Créer et sélectionner"
          onPendingChange={setCreatePending}
          onCancel={() => setCreateOpen(false)}
          onSuccess={(og) => {
            onChange(og.id);
            setDisplayLabel(og.displayName);
            setCreateOpen(false);
          }}
        />
      </FormSidePanel>
    </div>
  );
}
