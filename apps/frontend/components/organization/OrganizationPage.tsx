"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/components/auth/AuthContext";
import { useOrganization } from "@/lib/organization";
import { useToast } from "@/components/ui/ToastProvider";
import { PostalAddressFields } from "@/components/address/PostalAddressFields";
import * as organizationsApi from "@/lib/organizations.api";
import { hasPermission } from "@/lib/auth-permissions";
function formatValue(value: string | undefined | null) {
  const v = value?.trim();
  return v && v.length > 0 ? v : "—";
}

export function OrganizationPage() {
  const { user } = useAuth();
  const { activeOrganization } = useOrganization();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const canUpdateOrganization = hasPermission(user, "organizations.update");

  const displayName = activeOrganization?.name?.trim() || "Organisation";
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    addressLine1: "",
    addressLine2: "",
    postalCode: "",
    city: "",
    country: "",
  });

  useEffect(() => {
    setForm({
      name: activeOrganization?.name ?? "",
      email: activeOrganization?.email ?? "",
      phone: activeOrganization?.phone ?? "",
      addressLine1: activeOrganization?.addressLine1 ?? "",
      addressLine2: activeOrganization?.addressLine2 ?? "",
      postalCode: activeOrganization?.postalCode ?? "",
      city: activeOrganization?.city ?? "",
      country: activeOrganization?.country ?? "",
    });
  }, [activeOrganization]);

  const updateMutation = useMutation({
    mutationFn: () =>
      organizationsApi.updateMine({
        name: form.name.trim() || undefined,
        email: form.email.trim() || null,
        phone: form.phone.trim() || null,
        addressLine1: form.addressLine1.trim() || null,
        addressLine2: form.addressLine2.trim() || null,
        postalCode: form.postalCode.trim() || null,
        city: form.city.trim() || null,
        country: form.country.trim() || null,
      }),
    onSuccess: () => {
      showToast("Coordonnées de l’organisation mises à jour.");
      void queryClient.invalidateQueries({ queryKey: ["organizations", "mine"] });
      void queryClient.invalidateQueries({
        queryKey: ["organizations", "mine", user?.organizationId],
      });
      setIsEditing(false);
    },
    onError: (err: Error) => {
      showToast(err.message ?? "Impossible de mettre à jour l’organisation.", "error");
    },
  });

  const canSave = useMemo(() => form.name.trim().length > 0, [form.name]);

  const cancelEdit = () => {
    setIsEditing(false);
    setForm({
      name: activeOrganization?.name ?? "",
      email: activeOrganization?.email ?? "",
      phone: activeOrganization?.phone ?? "",
      addressLine1: activeOrganization?.addressLine1 ?? "",
      addressLine2: activeOrganization?.addressLine2 ?? "",
      postalCode: activeOrganization?.postalCode ?? "",
      city: activeOrganization?.city ?? "",
      country: activeOrganization?.country ?? "",
    });
  };

  return (
    <div className="space-y-8 w-full">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-slate-900 dark:text-slate-100">
            {displayName}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Coordonnées et identité de votre espace Syncora.
          </p>
        </div>
        {canUpdateOrganization && !isEditing && (
          <button
            type="button"
            onClick={() => setIsEditing(true)}
            className="rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-sm text-slate-700 dark:text-slate-200 transition hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            Modifier
          </button>
        )}
        {canUpdateOrganization && isEditing && (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={cancelEdit}
              className="rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-sm text-slate-700 dark:text-slate-200 transition hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={() => updateMutation.mutate()}
              disabled={!canSave || updateMutation.isPending}
              className="rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-500 disabled:opacity-50 transition"
            >
              {updateMutation.isPending ? "Enregistrement…" : "Enregistrer"}
            </button>
          </div>
        )}
      </div>

      <section className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5 shadow-sm dark:shadow-slate-950/20">
        <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
          <div>
            <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
              Coordonnées de l’organisation
            </h2>
          </div>
          <div className="text-right">
            <p className="text-[11px] uppercase tracking-wide text-slate-400 dark:text-slate-500">
              ID technique
            </p>
            <code className="text-xs text-slate-700 dark:text-slate-200 break-all">
              {user?.organizationId ?? "—"}
            </code>
          </div>
        </div>

        {isEditing ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Nom de l’organisation
              </span>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm text-slate-900 dark:text-slate-100"
              />
            </label>
            <label className="block">
              <span className="text-xs text-slate-500 dark:text-slate-400">Email</span>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm text-slate-900 dark:text-slate-100"
              />
            </label>
            <label className="block">
              <span className="text-xs text-slate-500 dark:text-slate-400">Téléphone</span>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm text-slate-900 dark:text-slate-100"
              />
            </label>
            <div className="sm:col-span-2">
              <PostalAddressFields
                legend="Coordonnées postales (Base Adresse Nationale — France)"
                line1={form.addressLine1}
                line2={form.addressLine2}
                postalCode={form.postalCode}
                city={form.city}
                country={form.country}
                onLine1Change={(v) => setForm((prev) => ({ ...prev, addressLine1: v }))}
                onLine2Change={(v) => setForm((prev) => ({ ...prev, addressLine2: v }))}
                onPostalChange={(v) => setForm((prev) => ({ ...prev, postalCode: v }))}
                onCityChange={(v) => setForm((prev) => ({ ...prev, city: v }))}
                onCountryChange={(v) => setForm((prev) => ({ ...prev, country: v }))}
                labelCls="mb-0.5 block text-xs text-slate-500 dark:text-slate-400"
                inputCls="mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm text-slate-900 dark:text-slate-100"
              />
            </div>
          </div>
        ) : (
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <div className="sm:col-span-2">
              <dt className="text-slate-500 dark:text-slate-400">Nom</dt>
              <dd className="font-medium text-slate-900 dark:text-slate-100 mt-0.5">
                {formatValue(activeOrganization?.name)}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500 dark:text-slate-400">Email</dt>
              <dd className="mt-0.5 text-slate-800 dark:text-slate-100">
                {formatValue(activeOrganization?.email)}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500 dark:text-slate-400">Téléphone</dt>
              <dd className="mt-0.5 text-slate-800 dark:text-slate-100">
                {formatValue(activeOrganization?.phone)}
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-slate-500 dark:text-slate-400">Adresse</dt>
              <dd className="mt-0.5 text-slate-800 dark:text-slate-100">
                {[activeOrganization?.addressLine1, activeOrganization?.addressLine2]
                  .filter(Boolean)
                  .join(", ") || "—"}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500 dark:text-slate-400">Code postal</dt>
              <dd className="mt-0.5 text-slate-800 dark:text-slate-100">
                {formatValue(activeOrganization?.postalCode)}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500 dark:text-slate-400">Ville</dt>
              <dd className="mt-0.5 text-slate-800 dark:text-slate-100">
                {formatValue(activeOrganization?.city)}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500 dark:text-slate-400">Pays</dt>
              <dd className="mt-0.5 text-slate-800 dark:text-slate-100">
                {formatValue(activeOrganization?.country)}
              </dd>
            </div>
            <div className="sm:col-span-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <dt className="text-slate-500 dark:text-slate-400">Créée le</dt>
              <dd className="font-medium text-slate-900 dark:text-slate-100 mt-0.5">
                {activeOrganization?.createdAt
                  ? new Date(activeOrganization.createdAt).toLocaleDateString("fr-FR")
                  : "—"}
              </dd>
            </div>
          </dl>
        )}
      </section>
    </div>
  );
}
