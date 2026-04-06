"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { PermissionCode } from "@syncora/shared";
import * as customersApi from "@/lib/customers.api";
import { useAuth } from "@/components/auth/AuthContext";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/ToastProvider";
import { CustomerEditForm } from "./CustomerEditForm";
import { CUSTOMER_KIND_LABELS } from "./customer-kind-labels";

function hasPermission(
  role: string | undefined,
  permissions: PermissionCode[] | undefined,
  code: PermissionCode
): boolean {
  if (role === "admin") return true;
  return permissions?.includes(code) ?? false;
}

function formatDate(iso?: string) {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleString("fr-FR", {
      dateStyle: "medium",
      timeStyle: "short"
    });
  } catch {
    return iso;
  }
}

export function CustomerDetailPage({ customerId }: { customerId: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const confirm = useConfirm();
  const { showToast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [mutationError, setMutationError] = useState("");

  const canUpdate = hasPermission(user?.role, user?.permissions, "customers.update");
  const canDelete = hasPermission(user?.role, user?.permissions, "customers.delete");

  const { data: c, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["customer", customerId],
    queryFn: () => customersApi.getCustomer(customerId)
  });

  const updateMutation = useMutation({
    mutationFn: (payload: customersApi.UpdateCustomerPayload) =>
      customersApi.updateCustomer(customerId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customer", customerId] });
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      setIsEditing(false);
      setMutationError("");
      showToast("Client mis à jour.");
      void refetch();
    },
    onError: (err: Error) => setMutationError(err.message)
  });

  const deleteMutation = useMutation({
    mutationFn: () => customersApi.deleteCustomer(customerId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      showToast("Client supprimé.");
      router.push("/customers");
    },
    onError: (err: Error) => setMutationError(err.message)
  });

  if (isLoading) {
    return <div className="text-sm text-slate-500">Chargement…</div>;
  }

  if (isError || !c) {
    return (
      <div className="space-y-4">
        <Link href="/customers" className="text-sm font-medium text-brand-600 hover:text-brand-500">
          &larr; Clients
        </Link>
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          {error instanceof Error ? error.message : "Client introuvable."}
          <button
            type="button"
            onClick={() => refetch()}
            className="ml-3 rounded-lg border border-red-300 bg-white px-3 py-1 text-xs font-medium text-red-800 hover:bg-red-50"
          >
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  const created = formatDate(c.createdAt);
  const updated = formatDate(c.updatedAt);

  const handleDelete = async () => {
    const ok = await confirm({
      title: "Supprimer ce client ?",
      description:
        "Le client sera archivé (suppression logique) : il ne figurera plus dans les listes ni dans les sélecteurs, mais les dossiers déjà liés conservent leur référence.",
      confirmLabel: "Archiver le client",
      variant: "danger"
    });
    if (!ok) return;
    setMutationError("");
    deleteMutation.mutate();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/customers" className="text-sm font-medium text-brand-600 hover:text-brand-500">
          &larr; Clients
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          {canUpdate && !isEditing && (
            <button
              type="button"
              onClick={() => {
                setMutationError("");
                setIsEditing(true);
              }}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-700 transition hover:bg-slate-50"
            >
              Modifier
            </button>
          )}
          {canDelete && !isEditing && (
            <button
              type="button"
              onClick={() => void handleDelete()}
              disabled={deleteMutation.isPending}
              className="rounded-lg border border-red-200 px-3 py-1.5 text-sm text-red-600 transition hover:bg-red-50 disabled:opacity-50"
            >
              {deleteMutation.isPending ? "…" : "Supprimer"}
            </button>
          )}
        </div>
      </div>

      {mutationError && !isEditing && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{mutationError}</div>
      )}

      {isEditing ? (
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="mb-4 text-lg font-semibold text-slate-900">Modifier le client</h2>
          <CustomerEditForm
            customer={c}
            isPending={updateMutation.isPending}
            error={mutationError}
            onCancel={() => {
              setMutationError("");
              setIsEditing(false);
            }}
            onSubmit={(payload) => {
              setMutationError("");
              updateMutation.mutate(payload);
            }}
          />
        </div>
      ) : (
        <>
          <div>
            <h1 className="text-xl font-semibold text-slate-900 sm:text-2xl">{c.displayName}</h1>
            <p className="mt-1 text-sm text-slate-600">{CUSTOMER_KIND_LABELS[c.kind]}</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:col-span-2">
              <h2 className="text-sm font-semibold text-slate-800">Coordonnées</h2>
              <dl className="mt-3 space-y-2 text-sm">
                {c.email && (
                  <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-4">
                    <dt className="text-slate-500 sm:w-32">E-mail</dt>
                    <dd>
                      <a href={`mailto:${c.email}`} className="text-brand-600 hover:text-brand-500">
                        {c.email}
                      </a>
                    </dd>
                  </div>
                )}
                {c.phone && (
                  <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-4">
                    <dt className="text-slate-500 sm:w-32">Téléphone</dt>
                    <dd>
                      <a href={`tel:${c.phone}`} className="text-slate-800">
                        {c.phone}
                      </a>
                    </dd>
                  </div>
                )}
                {c.mobile && (
                  <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-4">
                    <dt className="text-slate-500 sm:w-32">Mobile</dt>
                    <dd>
                      <a href={`tel:${c.mobile}`} className="text-slate-800">
                        {c.mobile}
                      </a>
                    </dd>
                  </div>
                )}
                {!c.email && !c.phone && !c.mobile && (
                  <p className="text-slate-500">Aucune coordonnée renseignée.</p>
                )}
              </dl>
            </div>

            {(c.kind === "individual" && (c.firstName || c.lastName)) ||
            (c.kind === "company" && c.companyName) ||
            c.legalIdentifier ? (
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:col-span-2">
                <h2 className="text-sm font-semibold text-slate-800">Identité</h2>
                <dl className="mt-3 space-y-2 text-sm">
                  {c.kind === "individual" && (c.firstName || c.lastName) && (
                    <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-4">
                      <dt className="text-slate-500 sm:w-32">Nom complet</dt>
                      <dd className="text-slate-800">
                        {[c.firstName, c.lastName].filter(Boolean).join(" ")}
                      </dd>
                    </div>
                  )}
                  {c.kind === "company" && c.companyName && (
                    <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-4">
                      <dt className="text-slate-500 sm:w-32">Raison sociale</dt>
                      <dd className="text-slate-800">{c.companyName}</dd>
                    </div>
                  )}
                  {c.legalIdentifier && (
                    <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-4">
                      <dt className="text-slate-500 sm:w-32">Identifiant légal</dt>
                      <dd className="text-slate-800">{c.legalIdentifier}</dd>
                    </div>
                  )}
                </dl>
              </div>
            ) : null}

            {c.address && (
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:col-span-2">
                <h2 className="text-sm font-semibold text-slate-800">Adresse</h2>
                <address className="mt-3 text-sm not-italic text-slate-700">
                  {c.address.line1}
                  <br />
                  {c.address.line2 ? (
                    <>
                      {c.address.line2}
                      <br />
                    </>
                  ) : null}
                  {c.address.postalCode} {c.address.city}
                  <br />
                  {c.address.country}
                </address>
              </div>
            )}

            {c.notes && (
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:col-span-2">
                <h2 className="text-sm font-semibold text-slate-800">Notes</h2>
                <p className="mt-3 whitespace-pre-wrap text-sm text-slate-700">{c.notes}</p>
              </div>
            )}

            {(created || updated) && (
              <div className="text-xs text-slate-500 sm:col-span-2">
                {created && <span>Créé le {created}</span>}
                {created && updated && <span className="mx-2">·</span>}
                {updated && <span>Mis à jour le {updated}</span>}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
