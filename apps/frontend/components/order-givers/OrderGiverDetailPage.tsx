"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as orderGiversApi from "@/lib/order-givers.api";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/ToastProvider";
import { usePermissions } from "@/lib/hooks/usePermissions";
import { OrderGiverEditForm } from "./OrderGiverEditForm";
import { OrderGiverCasesSection } from "./OrderGiverCasesSection";
import { PartyLinkedInvoicesSection } from "@/components/billing/PartyLinkedInvoicesSection";
import { CUSTOMER_KIND_LABELS } from "@/components/customers/customer-kind-labels";
import { AppErrorAlert } from "@/components/ui/AppErrorAlert";
import { TestDataBadgeIf } from "@/components/test-data/TestDataBadge";
import { useRegisterQuickActionLabel } from "@/components/dashboard/QuickActionLabelContext";

function formatDate(iso?: string) {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleString("fr-FR", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

export function OrderGiverDetailPage({ orderGiverId }: { orderGiverId: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { can } = usePermissions();
  const confirm = useConfirm();
  const { showToast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [mutationError, setMutationError] = useState("");

  const canUpdate = can("order_givers.update");
  const canDelete = can("order_givers.delete");

  const {
    data: og,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["order-giver", orderGiverId],
    queryFn: () => orderGiversApi.getOrderGiver(orderGiverId),
  });

  const updateMutation = useMutation({
    mutationFn: (payload: orderGiversApi.UpdateOrderGiverPayload) =>
      orderGiversApi.updateOrderGiver(orderGiverId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["order-giver", orderGiverId] });
      queryClient.invalidateQueries({ queryKey: ["order-givers"] });
      setIsEditing(false);
      setMutationError("");
      showToast("Donneur d'ordre mis à jour.");
      void refetch();
    },
    onError: (err: Error) => setMutationError(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: () => orderGiversApi.deleteOrderGiver(orderGiverId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["order-givers"] });
      showToast("Donneur d'ordre supprimé.");
      router.push("/order-givers");
    },
    onError: (err: Error) => setMutationError(err.message),
  });

  useRegisterQuickActionLabel(og?.displayName);

  if (isLoading) {
    return <div className="text-sm text-slate-500 dark:text-slate-400">Chargement…</div>;
  }

  if (isError || !og) {
    return (
      <div className="space-y-4">
        <Link
          href="/order-givers"
          className="text-sm font-medium text-brand-600 dark:text-brand-400 hover:text-brand-500"
        >
          &larr; Donneurs d&apos;ordre
        </Link>
        {isError ? (
          <AppErrorAlert error={error} onRetry={() => void refetch()} />
        ) : (
          <p className="text-sm text-slate-700 dark:text-slate-200">
            Donneur d&apos;ordre introuvable.
          </p>
        )}
      </div>
    );
  }

  const created = formatDate(og.createdAt);
  const updated = formatDate(og.updatedAt);

  const handleDelete = async () => {
    const ok = await confirm({
      title: "Supprimer ce donneur d'ordre ?",
      description:
        "Le donneur d'ordre sera archivé (suppression logique) : il ne figurera plus dans les listes ni dans les sélecteurs, mais les dossiers déjà liés conservent leur référence.",
      confirmLabel: "Archiver le donneur d'ordre",
      variant: "danger",
    });
    if (!ok) return;
    setMutationError("");
    deleteMutation.mutate();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/order-givers"
          className="text-sm font-medium text-brand-600 dark:text-brand-400 hover:text-brand-500"
        >
          &larr; Donneurs d&apos;ordre
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          {canUpdate && !isEditing && (
            <button
              type="button"
              onClick={() => {
                setMutationError("");
                setIsEditing(true);
              }}
              className="rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-sm text-slate-700 dark:text-slate-200 transition hover:bg-slate-50 dark:hover:bg-slate-800"
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
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {mutationError}
        </div>
      )}

      {isEditing ? (
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5 shadow-sm dark:shadow-slate-950/20 sm:p-6">
          <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-slate-100">
            Modifier le donneur d&apos;ordre
          </h2>
          <OrderGiverEditForm
            orderGiver={og}
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
            <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100 sm:text-2xl inline-flex items-center gap-2 flex-wrap">
              {og.displayName}
              <TestDataBadgeIf isTestData={og.isTestData} />
            </h1>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
              {CUSTOMER_KIND_LABELS[og.kind]}
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5 shadow-sm dark:shadow-slate-950/20 sm:col-span-2">
              <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                Coordonnées
              </h2>
              <dl className="mt-3 space-y-2 text-sm">
                {og.email && (
                  <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-4">
                    <dt className="text-slate-500 dark:text-slate-400 sm:w-32">E-mail</dt>
                    <dd>
                      <a
                        href={`mailto:${og.email}`}
                        className="text-brand-600 dark:text-brand-400 hover:text-brand-500"
                      >
                        {og.email}
                      </a>
                    </dd>
                  </div>
                )}
                {og.phone && (
                  <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-4">
                    <dt className="text-slate-500 dark:text-slate-400 sm:w-32">Téléphone</dt>
                    <dd>
                      <a href={`tel:${og.phone}`} className="text-slate-800 dark:text-slate-100">
                        {og.phone}
                      </a>
                    </dd>
                  </div>
                )}
                {og.mobile && (
                  <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-4">
                    <dt className="text-slate-500 dark:text-slate-400 sm:w-32">Mobile</dt>
                    <dd>
                      <a href={`tel:${og.mobile}`} className="text-slate-800 dark:text-slate-100">
                        {og.mobile}
                      </a>
                    </dd>
                  </div>
                )}
                {og.address && (
                  <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-4">
                    <dt className="text-slate-500 dark:text-slate-400 sm:w-32">Adresse</dt>
                    <dd>
                      <address className="not-italic text-slate-800 dark:text-slate-100">
                        {og.address.line1}
                        <br />
                        {og.address.line2 ? (
                          <>
                            {og.address.line2}
                            <br />
                          </>
                        ) : null}
                        {og.address.postalCode} {og.address.city}
                        <br />
                        {og.address.country}
                      </address>
                    </dd>
                  </div>
                )}
                {!og.email && !og.phone && !og.mobile && !og.address && (
                  <p className="text-slate-500 dark:text-slate-400">
                    Aucune coordonnée renseignée.
                  </p>
                )}
              </dl>
            </div>

            {(og.kind === "individual" && (og.firstName || og.lastName)) ||
            (og.kind === "company" && og.companyName) ||
            og.legalIdentifier ? (
              <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5 shadow-sm dark:shadow-slate-950/20 sm:col-span-2">
                <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                  Identité
                </h2>
                <dl className="mt-3 space-y-2 text-sm">
                  {og.kind === "individual" && (og.firstName || og.lastName) && (
                    <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-4">
                      <dt className="text-slate-500 dark:text-slate-400 sm:w-32">Nom complet</dt>
                      <dd className="text-slate-800 dark:text-slate-100">
                        {[og.firstName, og.lastName].filter(Boolean).join(" ")}
                      </dd>
                    </div>
                  )}
                  {og.kind === "company" && og.companyName && (
                    <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-4">
                      <dt className="text-slate-500 dark:text-slate-400 sm:w-32">Raison sociale</dt>
                      <dd className="text-slate-800 dark:text-slate-100">{og.companyName}</dd>
                    </div>
                  )}
                  {og.legalIdentifier && (
                    <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-4">
                      <dt className="text-slate-500 dark:text-slate-400 sm:w-32">Siret</dt>
                      <dd className="text-slate-800 dark:text-slate-100">{og.legalIdentifier}</dd>
                    </div>
                  )}
                </dl>
              </div>
            ) : null}

            {og.notes && (
              <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5 shadow-sm dark:shadow-slate-950/20 sm:col-span-2">
                <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Notes</h2>
                <p className="mt-3 whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-200">
                  {og.notes}
                </p>
              </div>
            )}

            {(created || updated) && (
              <div className="text-xs text-slate-500 dark:text-slate-400 sm:col-span-2">
                {created && <span>Créé le {created}</span>}
                {created && updated && <span className="mx-2">·</span>}
                {updated && <span>Mis à jour le {updated}</span>}
              </div>
            )}
          </div>
        </>
      )}

      <OrderGiverCasesSection orderGiverId={orderGiverId} />

      <PartyLinkedInvoicesSection
        orderGiverId={orderGiverId}
        emptyMessage="Aucune facture liée aux dossiers de ce donneur d'ordre."
      />
    </div>
  );
}
