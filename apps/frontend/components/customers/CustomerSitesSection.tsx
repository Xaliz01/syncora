"use client";

import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { CustomerResponse, CustomerSiteResponse, PostalAddress } from "@planwise/shared";
import * as customersApi from "@/lib/customers.api";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/ToastProvider";
import { usePermissions } from "@/lib/hooks/usePermissions";
import { PostalAddressFields } from "@/components/address/PostalAddressFields";

function formatAddress(address: PostalAddress): string {
  const parts = [address.line1];
  if (address.line2) parts.push(address.line2);
  parts.push(`${address.postalCode} ${address.city}`);
  if (address.country && address.country !== "FR") parts.push(address.country);
  return parts.join(", ");
}

interface SiteFormData {
  label: string;
  address: PostalAddress;
  isDefault: boolean;
  notes: string;
}

const emptySiteForm: SiteFormData = {
  label: "",
  address: { line1: "", line2: "", postalCode: "", city: "", country: "FR" },
  isDefault: false,
  notes: "",
};

function SiteForm({
  initial,
  isPending,
  onSubmit,
  onCancel,
  submitLabel,
}: {
  initial: SiteFormData;
  isPending: boolean;
  onSubmit: (data: SiteFormData) => void;
  onCancel: () => void;
  submitLabel: string;
}) {
  const [form, setForm] = useState<SiteFormData>(initial);

  const canSubmit =
    form.label.trim() &&
    form.address.line1.trim() &&
    form.address.postalCode.trim() &&
    form.address.city.trim();

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (canSubmit) onSubmit(form);
      }}
      className="space-y-4"
    >
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">
          Libellé du site
        </label>
        <input
          value={form.label}
          onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
          placeholder="Ex. Chantier Paris 15e, Siège social…"
          className="w-full rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 bg-white dark:bg-slate-950"
        />
      </div>

      <PostalAddressFields
        line1={form.address.line1}
        line2={form.address.line2 ?? ""}
        postalCode={form.address.postalCode}
        city={form.address.city}
        country={form.address.country}
        onLine1Change={(v) => setForm((f) => ({ ...f, address: { ...f.address, line1: v } }))}
        onLine2Change={(v) => setForm((f) => ({ ...f, address: { ...f.address, line2: v } }))}
        onPostalChange={(v) => setForm((f) => ({ ...f, address: { ...f.address, postalCode: v } }))}
        onCityChange={(v) => setForm((f) => ({ ...f, address: { ...f.address, city: v } }))}
        onCountryChange={(v) => setForm((f) => ({ ...f, address: { ...f.address, country: v } }))}
        legend="Adresse du site"
      />

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="site-default"
          checked={form.isDefault}
          onChange={(e) => setForm((f) => ({ ...f, isDefault: e.target.checked }))}
          className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
        />
        <label htmlFor="site-default" className="text-sm text-slate-700 dark:text-slate-200">
          Site par défaut (adresse d&apos;intervention principale)
        </label>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">
          Notes (optionnel)
        </label>
        <textarea
          value={form.notes}
          onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
          rows={2}
          placeholder="Informations complémentaires sur ce site…"
          className="w-full rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 bg-white dark:bg-slate-950"
        />
      </div>

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={!canSubmit || isPending}
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-700 disabled:opacity-50"
        >
          {isPending ? "…" : submitLabel}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-slate-200 dark:border-slate-700 px-4 py-2 text-sm text-slate-700 dark:text-slate-200 transition hover:bg-slate-50 dark:hover:bg-slate-800"
        >
          Annuler
        </button>
      </div>
    </form>
  );
}

export function CustomerSitesSection({ customer }: { customer: CustomerResponse }) {
  const queryClient = useQueryClient();
  const { can } = usePermissions();
  const confirm = useConfirm();
  const { showToast } = useToast();
  const canUpdate = can("customers.update");

  const [showAddForm, setShowAddForm] = useState(false);
  const [editingSiteId, setEditingSiteId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const sites = customer.sites ?? [];

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["customer", customer.id] });
    queryClient.invalidateQueries({ queryKey: ["customers"] });
  };

  const createMutation = useMutation({
    mutationFn: (payload: customersApi.CreateCustomerSitePayload) =>
      customersApi.createCustomerSite(customer.id, payload),
    onSuccess: () => {
      invalidate();
      setShowAddForm(false);
      setError("");
      showToast("Site ajouté.");
    },
    onError: (err: Error) => setError(err.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({
      siteId,
      payload,
    }: {
      siteId: string;
      payload: customersApi.UpdateCustomerSitePayload;
    }) => customersApi.updateCustomerSite(customer.id, siteId, payload),
    onSuccess: () => {
      invalidate();
      setEditingSiteId(null);
      setError("");
      showToast("Site mis à jour.");
    },
    onError: (err: Error) => setError(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (siteId: string) => customersApi.deleteCustomerSite(customer.id, siteId),
    onSuccess: () => {
      invalidate();
      setError("");
      showToast("Site supprimé.");
    },
    onError: (err: Error) => setError(err.message),
  });

  const handleDelete = async (site: CustomerSiteResponse) => {
    const ok = await confirm({
      title: "Supprimer ce site ?",
      description: `Le site « ${site.label} » sera supprimé. Les dossiers utilisant ce site comme adresse d'intervention perdront cette référence.`,
      confirmLabel: "Supprimer",
      variant: "danger",
    });
    if (!ok) return;
    setError("");
    deleteMutation.mutate(site.id);
  };

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5 shadow-sm dark:shadow-slate-950/20">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
          Sites d&apos;intervention
        </h2>
        {canUpdate && !showAddForm && (
          <button
            type="button"
            onClick={() => {
              setShowAddForm(true);
              setEditingSiteId(null);
              setError("");
            }}
            className="rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-brand-700"
          >
            Ajouter un site
          </button>
        )}
      </div>

      {error && (
        <div className="mb-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {showAddForm && (
        <div className="mb-4 rounded-lg border border-slate-200 dark:border-slate-700 p-4 bg-slate-50 dark:bg-slate-800/50">
          <h3 className="mb-3 text-sm font-medium text-slate-800 dark:text-slate-100">
            Nouveau site
          </h3>
          <SiteForm
            initial={emptySiteForm}
            isPending={createMutation.isPending}
            submitLabel="Ajouter"
            onCancel={() => {
              setShowAddForm(false);
              setError("");
            }}
            onSubmit={(data) => {
              setError("");
              createMutation.mutate({
                label: data.label.trim(),
                address: {
                  line1: data.address.line1.trim(),
                  line2: data.address.line2?.trim() || undefined,
                  postalCode: data.address.postalCode.trim(),
                  city: data.address.city.trim(),
                  country: data.address.country.trim() || "FR",
                },
                isDefault: data.isDefault || undefined,
                notes: data.notes.trim() || undefined,
              });
            }}
          />
        </div>
      )}

      {sites.length === 0 && !showAddForm && (
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Aucun site d&apos;intervention. Ajoutez des adresses pour ce client (chantiers, locaux…).
        </p>
      )}

      {sites.length > 0 && (
        <div className="space-y-3">
          {sites.map((site) => (
            <div
              key={site.id}
              className="rounded-lg border border-slate-200 dark:border-slate-700 p-3"
            >
              {editingSiteId === site.id ? (
                <SiteForm
                  initial={{
                    label: site.label,
                    address: {
                      line1: site.address.line1,
                      line2: site.address.line2 ?? "",
                      postalCode: site.address.postalCode,
                      city: site.address.city,
                      country: site.address.country,
                    },
                    isDefault: site.isDefault ?? false,
                    notes: site.notes ?? "",
                  }}
                  isPending={updateMutation.isPending}
                  submitLabel="Enregistrer"
                  onCancel={() => {
                    setEditingSiteId(null);
                    setError("");
                  }}
                  onSubmit={(data) => {
                    setError("");
                    updateMutation.mutate({
                      siteId: site.id,
                      payload: {
                        label: data.label.trim(),
                        address: {
                          line1: data.address.line1.trim(),
                          line2: data.address.line2?.trim() || undefined,
                          postalCode: data.address.postalCode.trim(),
                          city: data.address.city.trim(),
                          country: data.address.country.trim() || "FR",
                        },
                        isDefault: data.isDefault,
                        notes: data.notes.trim() || null,
                      },
                    });
                  }}
                />
              ) : (
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-slate-800 dark:text-slate-100">
                        {site.label}
                      </span>
                      {site.isDefault && (
                        <span className="inline-flex items-center rounded-full bg-brand-100 dark:bg-brand-900/30 px-2 py-0.5 text-[10px] font-medium text-brand-700 dark:text-brand-300">
                          Par défaut
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-sm text-slate-600 dark:text-slate-300 truncate">
                      {formatAddress(site.address)}
                    </p>
                    {site.notes && (
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        {site.notes}
                      </p>
                    )}
                  </div>
                  {canUpdate && (
                    <div className="flex shrink-0 gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingSiteId(site.id);
                          setShowAddForm(false);
                          setError("");
                        }}
                        className="rounded px-2 py-1 text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                      >
                        Modifier
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleDelete(site)}
                        disabled={deleteMutation.isPending}
                        className="rounded px-2 py-1 text-xs text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 disabled:opacity-50"
                      >
                        Supprimer
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
