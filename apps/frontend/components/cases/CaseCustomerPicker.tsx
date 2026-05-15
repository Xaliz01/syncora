"use client";

import React, { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import * as customersApi from "@/lib/customers.api";
import type { CustomerResponse } from "@syncora/shared";
import { CustomerCreateForm } from "@/components/customers/CustomerCreateForm";
import { CUSTOMER_KIND_LABELS } from "@/components/customers/customer-kind-labels";

export function CaseCustomerPicker({
  value,
  initialDisplayName,
  onChange,
  disabled,
  idPrefix = "case-customer",
}: {
  value: string;
  /** Libellé affiché quand le parent connaît déjà le client (ex. fiche dossier) */
  initialDisplayName?: string;
  onChange: (customerId: string) => void;
  disabled?: boolean;
  idPrefix?: string;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [displayLabel, setDisplayLabel] = useState(initialDisplayName ?? "");
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    if (!value) {
      setDisplayLabel("");
      return;
    }
    if (initialDisplayName) setDisplayLabel(initialDisplayName);
  }, [value, initialDisplayName]);

  const listEnabled = open && !showCreate && (debounced.length === 0 || debounced.length >= 2);

  const { data: list = [], isFetching } = useQuery({
    queryKey: ["customers", "list", debounced],
    queryFn: () => customersApi.listCustomers(debounced || undefined),
    enabled: listEnabled,
    staleTime: 20_000,
  });

  const selectCustomer = (c: CustomerResponse) => {
    onChange(c.id);
    setDisplayLabel(c.displayName);
    setOpen(false);
    setSearch("");
  };

  const clearSelection = () => {
    onChange("");
    setDisplayLabel("");
    setSearch("");
    setOpen(false);
  };

  return (
    <div className="space-y-2">
      <label
        htmlFor={`${idPrefix}-trigger`}
        className="block text-sm font-medium text-slate-700 dark:text-slate-200"
      >
        Client
      </label>
      <p className="text-xs text-slate-500 dark:text-slate-400">
        Liez un client existant ou créez-en un rapidement pour ce dossier.
      </p>

      <div className="relative">
        <button
          id={`${idPrefix}-trigger`}
          type="button"
          disabled={disabled}
          onClick={() => {
            if (disabled) return;
            setOpen((o) => !o);
            setShowCreate(false);
          }}
          className="flex w-full items-center justify-between gap-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-left text-sm text-slate-800 dark:text-slate-100 hover:border-slate-300 dark:border-slate-600 disabled:opacity-50"
        >
          <span
            className={
              displayLabel
                ? "text-slate-800 dark:text-slate-100"
                : "text-slate-400 dark:text-slate-500"
            }
          >
            {displayLabel || "Choisir un client…"}
          </span>
          <span className="text-xs text-slate-400 dark:text-slate-500">{open ? "▲" : "▼"}</span>
        </button>

        {open && !disabled && (
          <div className="absolute z-40 mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-lg">
            {!showCreate ? (
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
                    list.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => selectCustomer(c)}
                        className="flex w-full flex-col items-start rounded-md px-2 py-2 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-800"
                      >
                        <span className="font-medium text-slate-800 dark:text-slate-100">
                          {c.displayName}
                        </span>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400">
                          {CUSTOMER_KIND_LABELS[c.kind]}
                          {c.email ? ` · ${c.email}` : ""}
                        </span>
                      </button>
                    ))}
                  {!isFetching && list.length === 0 && debounced.length !== 1 && (
                    <p className="px-2 py-2 text-xs text-slate-500 dark:text-slate-400">
                      Aucun client trouvé.
                    </p>
                  )}
                </div>
                <div className="mt-2 flex flex-wrap gap-2 border-t border-slate-100 dark:border-slate-800 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowCreate(true)}
                    className="rounded-md bg-brand-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-brand-500"
                  >
                    Nouveau client
                  </button>
                  {value && (
                    <button
                      type="button"
                      onClick={clearSelection}
                      className="rounded-md border border-slate-200 dark:border-slate-700 px-2.5 py-1.5 text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                    >
                      Retirer le client
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
            ) : (
              <CustomerCreateForm
                compact
                submitLabel="Créer et sélectionner"
                onCancel={() => setShowCreate(false)}
                onSuccess={(c) => {
                  onChange(c.id);
                  setDisplayLabel(c.displayName);
                  setShowCreate(false);
                  setOpen(false);
                }}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
