"use client";

import React, { useEffect, useRef, useState } from "react";
import type { TrialTestDataStatus } from "@planwise/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  invalidateQueriesAfterDemoDataChange,
  getTrialTestDataStatus,
  injectTrialTestData,
  purgeTrialTestData,
} from "@/lib/trial-test-data.api";
import * as subscriptionsApi from "@/lib/subscriptions.api";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { useAuth } from "@/components/auth/AuthContext";

export function TrialTestDataCard() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const confirm = useConfirm();
  const [actionError, setActionError] = useState<string | null>(null);
  const isOrganizationAdmin = user?.role === "admin";

  const { data: subscription } = useQuery({
    queryKey: ["subscription", "current"],
    queryFn: () => subscriptionsApi.getSubscriptionCurrent(),
  });

  const isTrialing = subscription?.status === "trialing";

  const { data: status, isLoading: statusLoading } = useQuery({
    queryKey: ["trial-test-data", "status"],
    queryFn: () => getTrialTestDataStatus(),
    enabled: isOrganizationAdmin && subscription !== undefined,
    refetchInterval: (query) => (query.state.data?.status === "injecting" ? 2000 : false),
  });

  const showPurgeOnly = !isTrialing && (status?.status === "ready" || status?.hasTestData);

  const prevInjectionStatusRef = useRef<TrialTestDataStatus | undefined>(undefined);

  useEffect(() => {
    const prev = prevInjectionStatusRef.current;
    const current = status?.status;
    if (prev === "injecting" && (current === "ready" || current === "failed")) {
      void invalidateQueriesAfterDemoDataChange(queryClient);
    }
    if (current) {
      prevInjectionStatusRef.current = current;
    }
  }, [status?.status, queryClient]);

  const injectMutation = useMutation({
    mutationFn: () => injectTrialTestData(),
    onSuccess: () => {
      setActionError(null);
      void queryClient.invalidateQueries({ queryKey: ["trial-test-data", "status"] });
    },
    onError: (err: Error) => setActionError(err.message),
  });

  const purgeMutation = useMutation({
    mutationFn: () => purgeTrialTestData(),
    onSuccess: async () => {
      setActionError(null);
      await queryClient.invalidateQueries({ queryKey: ["trial-test-data", "status"] });
      await invalidateQueriesAfterDemoDataChange(queryClient);
    },
    onError: (err: Error) => setActionError(err.message),
  });

  if (!isOrganizationAdmin || subscription === undefined) {
    return null;
  }

  if (!isTrialing && !showPurgeOnly) {
    return null;
  }

  const isInjecting = status?.status === "injecting" || injectMutation.isPending;
  const hasReadyData = status?.status === "ready";
  const canInject = isTrialing && !isInjecting && !hasReadyData;

  return (
    <section
      className="rounded-xl border-2 border-violet-300 dark:border-violet-700 bg-gradient-to-br from-violet-50 to-white dark:from-violet-950/40 dark:to-slate-900 p-4 sm:p-5 shadow-sm"
      aria-labelledby="trial-test-data-heading"
    >
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="space-y-2 min-w-0">
          <h2
            id="trial-test-data-heading"
            className="text-base font-semibold text-violet-900 dark:text-violet-100"
          >
            {showPurgeOnly
              ? "Données de démonstration restantes"
              : "Explorer Planwise avec des données de démonstration"}
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            {showPurgeOnly ? (
              <>
                Votre essai est terminé mais des données de démo sont encore présentes. Vous pouvez
                les supprimer manuellement.
              </>
            ) : (
              <>
                Pendant votre essai, chargez un jeu complet : environ 100 clients et dossiers, 30
                articles, 6 techniciens, 2 équipes, des profils et modèles de dossiers — tous
                marqués « Démo », dont une vingtaine vous seront assignés pour alimenter votre
                tableau de bord. L’injection se fait en arrière-plan ; vous pouvez supprimer ce jeu
                à tout moment. Il sera retiré automatiquement à la fin de votre période d’essai.
              </>
            )}
          </p>
          {statusLoading && (
            <p className="text-xs text-slate-500 dark:text-slate-400">Chargement du statut…</p>
          )}
          {isInjecting && (
            <p className="text-xs text-violet-700 dark:text-violet-300 font-medium">
              Injection en cours… Actualisation automatique.
            </p>
          )}
          {status?.status === "failed" && status.errorMessage && (
            <p className="text-xs text-red-600 dark:text-red-400">{status.errorMessage}</p>
          )}
          {hasReadyData && status.injectedAt && (
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Données de démo disponibles depuis le{" "}
              {new Date(status.injectedAt).toLocaleString("fr-FR")}.
            </p>
          )}
          {actionError && <p className="text-xs text-red-600 dark:text-red-400">{actionError}</p>}
        </div>
        <div className="flex flex-col sm:flex-row gap-2 shrink-0">
          {canInject && (
            <button
              type="button"
              disabled={isInjecting}
              onClick={() => injectMutation.mutate()}
              className="inline-flex items-center justify-center rounded-lg bg-violet-600 hover:bg-violet-700 disabled:opacity-50 disabled:pointer-events-none text-white text-sm font-medium px-4 py-2.5 transition-colors"
            >
              {isInjecting ? "Injection…" : "Injecter les données de démo"}
            </button>
          )}
          {(hasReadyData || status?.status === "failed" || showPurgeOnly) && (
            <button
              type="button"
              disabled={purgeMutation.isPending || isInjecting}
              onClick={async () => {
                const ok = await confirm({
                  title: "Supprimer les données de démo ?",
                  description:
                    "Tous les clients, dossiers, interventions, équipes, techniciens, véhicules, agences, articles, profils et modèles marqués « Démo » seront définitivement supprimés. Cette action est irréversible.",
                  confirmLabel: "Supprimer les données de démo",
                  variant: "danger",
                });
                if (ok) purgeMutation.mutate();
              }}
              className="inline-flex items-center justify-center rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 text-sm font-medium px-4 py-2.5 transition-colors"
            >
              {purgeMutation.isPending ? "Suppression…" : "Supprimer les données de démo"}
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
