"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/components/auth/AuthContext";
import { useToast } from "@/components/ui/ToastProvider";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { IntegrationProviderLogo } from "@/components/integrations/IntegrationProviderLogo";
import { hasPermission } from "@/lib/auth-permissions";
import * as integrationsApi from "@/lib/integrations.api";

export function DemoIntegrationSection() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const confirm = useConfirm();
  const queryClient = useQueryClient();
  const canRead = hasPermission(user, "integrations.demo.read");
  const canConfigure = hasPermission(user, "integrations.demo.configure");

  const { data: availability } = useQuery({
    queryKey: ["billing-integration-availability"],
    queryFn: () => integrationsApi.getBillingIntegrationAvailability(),
    enabled: canRead,
  });

  const { data: status, isLoading } = useQuery({
    queryKey: ["integrations", "demo"],
    queryFn: () => integrationsApi.getDemoStatus(),
    enabled: canRead,
  });

  const canReadPennylane = hasPermission(user, "integrations.pennylane.read");
  const canReadQonto = hasPermission(user, "integrations.qonto.read");
  const { data: pennylaneStatus } = useQuery({
    queryKey: ["integrations", "pennylane"],
    queryFn: () => integrationsApi.getPennylaneStatus(),
    enabled: canReadPennylane,
  });
  const { data: qontoStatus } = useQuery({
    queryKey: ["integrations", "qonto"],
    queryFn: () => integrationsApi.getQontoStatus(),
    enabled: canReadQonto,
  });

  const invalidateBillingIntegrations = () => {
    queryClient.invalidateQueries({ queryKey: ["integrations", "pennylane"] });
    queryClient.invalidateQueries({ queryKey: ["integrations", "qonto"] });
    queryClient.invalidateQueries({ queryKey: ["integrations", "demo"] });
    queryClient.invalidateQueries({ queryKey: ["billing-integration-availability"] });
  };

  const confirmReplaceOther = async () => {
    const other =
      pennylaneStatus?.connected === true
        ? "Pennylane"
        : qontoStatus?.connected === true
          ? "Qonto"
          : null;
    if (!other) return true;
    return confirm({
      title: `Remplacer ${other} par la facturation démo ?`,
      description: `Une seule intégration de facturation est active à la fois. La connexion ${other} sera déconnectée.`,
      confirmLabel: "Activer la démo",
      variant: "danger",
    });
  };

  const connectMutation = useMutation({
    mutationFn: () => integrationsApi.connectDemo(),
    onSuccess: () => {
      invalidateBillingIntegrations();
      showToast("Facturation démo activée.");
    },
    onError: (err: Error) => showToast(err.message, "error"),
  });

  const disconnectMutation = useMutation({
    mutationFn: () => integrationsApi.disconnectDemo(),
    onSuccess: () => {
      invalidateBillingIntegrations();
      showToast("Facturation démo désactivée.");
    },
    onError: (err: Error) => showToast(err.message, "error"),
  });

  const demoAvailable = availability?.demoAvailable === true;
  if (!canRead || (!demoAvailable && !status?.connected)) return null;

  return (
    <section className="rounded-xl border border-dashed border-slate-300 dark:border-slate-600 bg-slate-50/80 dark:bg-slate-900/50 p-5 shadow-sm space-y-4">
      <div className="flex gap-3">
        <IntegrationProviderLogo provider="demo" />
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100">
              Facturation démo
            </h2>
            <span className="rounded-md bg-slate-200 dark:bg-slate-700 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">
              Essai
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Simulez le parcours facture pendant votre essai, sans connecter Pennylane ou Qonto. Les
            factures restent locales à Planwise.
          </p>
        </div>
      </div>

      {isLoading ? (
        <p className="text-sm text-slate-500">Chargement…</p>
      ) : status?.connected ? (
        <div className="space-y-3">
          <div className="rounded-lg border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50 dark:bg-emerald-950/30 px-3 py-2 text-sm text-emerald-800 dark:text-emerald-200">
            Activée
            {status.companyName ? ` — ${status.companyName}` : ""}
          </div>
          {canConfigure && (
            <button
              type="button"
              disabled={disconnectMutation.isPending}
              onClick={async () => {
                const ok = await confirm({
                  title: "Désactiver la facturation démo ?",
                  description:
                    "Vous pourrez toujours connecter Pennylane ou Qonto. Les factures démo déjà créées restent visibles sur les dossiers.",
                  confirmLabel: "Désactiver",
                  variant: "danger",
                });
                if (ok) disconnectMutation.mutate();
              }}
              className="rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50"
            >
              {disconnectMutation.isPending ? "Désactivation…" : "Désactiver"}
            </button>
          )}
        </div>
      ) : (
        canConfigure &&
        demoAvailable && (
          <button
            type="button"
            disabled={connectMutation.isPending}
            onClick={async () => {
              if (!(await confirmReplaceOther())) return;
              connectMutation.mutate();
            }}
            className="rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-500 transition disabled:opacity-50"
          >
            {connectMutation.isPending ? "Activation…" : "Activer la facturation démo"}
          </button>
        )
      )}
    </section>
  );
}
