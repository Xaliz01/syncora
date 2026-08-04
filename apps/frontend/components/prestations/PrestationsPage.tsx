"use client";

import React, { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { TVA_RATES, type TvaRate } from "@planwise/shared";
import * as api from "@/lib/stock.api";
import { TestDataBadgeIf } from "@/components/test-data/TestDataBadge";
import { usePermissions } from "@/lib/hooks/usePermissions";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/ToastProvider";
import {
  ListCellDefault,
  ListCellMuted,
  ListCellPrimary,
  ListEmptyState,
  ListLoadingState,
  ListNoResults,
  ListPageError,
  ListPageHeader,
  ListPageRoot,
  ListPagination,
  LIST_PAGE_SIZE,
  ListSearchField,
  ListTableShell,
  ListToolbar,
} from "@/components/ui/list-page";
import { PermissionGate } from "@/components/auth/PermissionGate";

const GRID = "md:grid-cols-[1.2fr_0.7fr_0.7fr_0.5fr_0.5fr_0.8fr]";

const inputClass =
  "w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-950 px-3 py-2 text-sm";

const PRIMARY_BUTTON_CLASS =
  "rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-500 transition";

export function PrestationsPage() {
  const { can } = usePermissions();
  const confirm = useConfirm();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [offset, setOffset] = useState(0);
  const [showInactive, setShowInactive] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [reference, setReference] = useState("");
  const [unit, setUnit] = useState("unité");
  const [defaultPrice, setDefaultPrice] = useState("");
  const [defaultTvaRate, setDefaultTvaRate] = useState<TvaRate>(20);
  const [description, setDescription] = useState("");
  const [formError, setFormError] = useState("");

  useEffect(() => {
    setOffset(0);
  }, [search, showInactive]);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["prestations", search, showInactive, offset],
    queryFn: () =>
      api.listPrestations({
        search: search.trim() || undefined,
        activeOnly: !showInactive,
        limit: LIST_PAGE_SIZE,
        offset,
      }),
  });

  const resetForm = () => {
    setName("");
    setReference("");
    setUnit("unité");
    setDefaultPrice("");
    setDefaultTvaRate(20);
    setDescription("");
    setFormError("");
    setEditingId(null);
    setShowCreate(false);
  };

  const createMutation = useMutation({
    mutationFn: () =>
      api.createPrestation({
        name: name.trim(),
        reference: reference.trim(),
        unit: unit.trim() || "unité",
        defaultPrice: Number(defaultPrice.replace(",", ".")),
        defaultTvaRate,
        description: description.trim() || undefined,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["prestations"] });
      showToast("Prestation créée", "success");
      resetForm();
    },
    onError: (err: unknown) => {
      setFormError(err instanceof Error ? err.message : "Création impossible");
    },
  });

  const updateMutation = useMutation({
    mutationFn: () =>
      api.updatePrestation(editingId!, {
        name: name.trim(),
        reference: reference.trim(),
        unit: unit.trim() || "unité",
        defaultPrice: Number(defaultPrice.replace(",", ".")),
        defaultTvaRate,
        description: description.trim() || undefined,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["prestations"] });
      showToast("Prestation mise à jour", "success");
      resetForm();
    },
    onError: (err: unknown) => {
      setFormError(err instanceof Error ? err.message : "Mise à jour impossible");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deletePrestation(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["prestations"] });
      showToast("Prestation désactivée", "success");
    },
    onError: (err: unknown) => {
      showToast(err instanceof Error ? err.message : "Suppression impossible", "error");
    },
  });

  const rows = data?.prestations ?? [];
  const total = data?.total ?? 0;
  const hasActiveSearch = Boolean(search.trim()) || showInactive;

  const startEdit = (id: string) => {
    const row = rows.find((r) => r.id === id);
    if (!row) return;
    setEditingId(id);
    setShowCreate(true);
    setName(row.name);
    setReference(row.reference);
    setUnit(row.unit);
    setDefaultPrice(String(row.defaultPrice));
    setDefaultTvaRate(row.defaultTvaRate);
    setDescription(row.description ?? "");
    setFormError("");
  };

  const submitForm = (e: React.FormEvent) => {
    e.preventDefault();
    const price = Number(defaultPrice.replace(",", "."));
    if (!name.trim() || !reference.trim() || !Number.isFinite(price) || price < 0) {
      setFormError("Nom, référence et tarif HT (≥ 0) sont requis.");
      return;
    }
    if (editingId) updateMutation.mutate();
    else createMutation.mutate();
  };

  return (
    <ListPageRoot>
      <ListPageHeader
        title="Prestations"
        description="Catalogue de services tarifés (main-d’œuvre, forfaits, déplacements…) réutilisables sur devis et factures."
        action={
          can("prestations.create") ? (
            <button
              type="button"
              className={PRIMARY_BUTTON_CLASS}
              onClick={() => {
                resetForm();
                setShowCreate(true);
              }}
            >
              Nouvelle prestation
            </button>
          ) : undefined
        }
      />

      <ListToolbar>
        <ListSearchField
          value={search}
          onChange={setSearch}
          placeholder="Filtrer par nom ou référence…"
        />
        <label className="inline-flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
          <input
            type="checkbox"
            checked={showInactive}
            onChange={(e) => setShowInactive(e.target.checked)}
            className="accent-brand-600"
          />
          Inclure inactives
        </label>
      </ListToolbar>

      {showCreate && (can("prestations.create") || (editingId && can("prestations.update"))) ? (
        <form
          onSubmit={submitForm}
          className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 space-y-3"
        >
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
            {editingId ? "Modifier la prestation" : "Nouvelle prestation"}
          </h3>
          {formError ? <p className="text-sm text-red-600 dark:text-red-400">{formError}</p> : null}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="block space-y-1">
              <span className="text-xs font-medium text-slate-600 dark:text-slate-300">Nom</span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={inputClass}
                required
              />
            </label>
            <label className="block space-y-1">
              <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
                Référence
              </span>
              <input
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                className={inputClass}
                required
              />
            </label>
            <label className="block space-y-1">
              <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
                Tarif HT (€)
              </span>
              <input
                type="number"
                min={0}
                step={0.01}
                value={defaultPrice}
                onChange={(e) => setDefaultPrice(e.target.value)}
                className={inputClass}
                required
              />
            </label>
            <label className="block space-y-1">
              <span className="text-xs font-medium text-slate-600 dark:text-slate-300">TVA</span>
              <select
                value={defaultTvaRate}
                onChange={(e) => setDefaultTvaRate(Number(e.target.value) as TvaRate)}
                className={inputClass}
              >
                {TVA_RATES.map((r) => (
                  <option key={r} value={r}>
                    {r} %
                  </option>
                ))}
              </select>
            </label>
            <label className="block space-y-1">
              <span className="text-xs font-medium text-slate-600 dark:text-slate-300">Unité</span>
              <input
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className={inputClass}
              />
            </label>
            <label className="block space-y-1 sm:col-span-2">
              <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
                Description
              </span>
              <input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className={inputClass}
              />
            </label>
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={createMutation.isPending || updateMutation.isPending}
              className="rounded-lg bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-500 disabled:opacity-50"
            >
              {editingId ? "Enregistrer" : "Créer"}
            </button>
            <button
              type="button"
              onClick={resetForm}
              className="rounded-lg border border-slate-200 dark:border-slate-600 px-3 py-2 text-sm"
            >
              Annuler
            </button>
          </div>
        </form>
      ) : null}

      {isError ? (
        <ListPageError
          error={error}
          fallbackMessage="Impossible de charger les prestations."
          onRetry={() => void refetch()}
        />
      ) : null}

      {isLoading ? (
        <ListLoadingState />
      ) : total === 0 && !hasActiveSearch ? (
        <ListEmptyState message="Aucune prestation pour le moment." />
      ) : rows.length === 0 ? (
        <ListNoResults message="Aucune prestation ne correspond à ce filtre." />
      ) : (
        <>
          <ListTableShell
            gridTemplateClass={GRID}
            headerCells={
              <>
                <span>Nom</span>
                <span>Référence</span>
                <span>Tarif HT</span>
                <span>TVA</span>
                <span>Unité</span>
                <span>Actions</span>
              </>
            }
          >
            {rows.map((row) => (
              <div
                key={row.id}
                className={`grid grid-cols-1 gap-1 border-b border-slate-100 dark:border-slate-800 px-3 py-2.5 text-sm ${GRID}`}
              >
                <ListCellPrimary>
                  <span className="inline-flex items-center gap-2 min-w-0">
                    <span className="truncate">{row.name}</span>
                    <TestDataBadgeIf isTestData={row.isTestData} />
                    {!row.isActive ? (
                      <span className="text-[10px] uppercase text-slate-400">Inactive</span>
                    ) : null}
                  </span>
                </ListCellPrimary>
                <ListCellDefault>{row.reference}</ListCellDefault>
                <ListCellDefault>
                  {row.defaultPrice.toLocaleString("fr-FR", {
                    style: "currency",
                    currency: "EUR",
                  })}
                </ListCellDefault>
                <ListCellMuted>{row.defaultTvaRate} %</ListCellMuted>
                <ListCellMuted>{row.unit}</ListCellMuted>
                <div className="flex flex-wrap gap-2 items-center">
                  <PermissionGate permission="prestations.update">
                    <button
                      type="button"
                      onClick={() => startEdit(row.id)}
                      className="text-xs font-medium text-brand-600 hover:text-brand-500"
                    >
                      Modifier
                    </button>
                  </PermissionGate>
                  {row.isActive ? (
                    <PermissionGate permission="prestations.delete">
                      <button
                        type="button"
                        onClick={() => {
                          void confirm({
                            title: "Désactiver cette prestation ?",
                            description: `« ${row.name} » ne sera plus proposée dans l’autocomplete.`,
                            confirmLabel: "Désactiver",
                            variant: "danger",
                          }).then((ok) => {
                            if (ok) deleteMutation.mutate(row.id);
                          });
                        }}
                        className="text-xs font-medium text-red-600 hover:text-red-500"
                      >
                        Désactiver
                      </button>
                    </PermissionGate>
                  ) : null}
                </div>
              </div>
            ))}
          </ListTableShell>
          <ListPagination
            offset={offset}
            limit={LIST_PAGE_SIZE}
            total={total}
            onOffsetChange={setOffset}
          />
        </>
      )}
    </ListPageRoot>
  );
}
