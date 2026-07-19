"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/components/auth/AuthContext";
import { useToast } from "@/components/ui/ToastProvider";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { IntegrationProviderLogo } from "@/components/integrations/IntegrationProviderLogo";
import { hasPermission } from "@/lib/auth-permissions";
import * as integrationsApi from "@/lib/integrations.api";

export function QontoIntegrationSection() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const confirm = useConfirm();
  const queryClient = useQueryClient();
  const canRead = hasPermission(user, "integrations.qonto.read");
  const canConfigure = hasPermission(user, "integrations.qonto.configure");

  const [login, setLogin] = useState("");
  const [secretKey, setSecretKey] = useState("");
  const [showKeyForm, setShowKeyForm] = useState(false);

  const { data: status, isLoading } = useQuery({
    queryKey: ["integrations", "qonto"],
    queryFn: () => integrationsApi.getQontoStatus(),
    enabled: canRead,
  });

  const canReadPennylane = hasPermission(user, "integrations.pennylane.read");
  const { data: pennylaneStatus } = useQuery({
    queryKey: ["integrations", "pennylane"],
    queryFn: () => integrationsApi.getPennylaneStatus(),
    enabled: canReadPennylane,
  });

  const invalidateBillingIntegrations = () => {
    queryClient.invalidateQueries({ queryKey: ["integrations", "pennylane"] });
    queryClient.invalidateQueries({ queryKey: ["integrations", "qonto"] });
  };

  const confirmReplaceOther = async () => {
    if (!pennylaneStatus?.connected) return true;
    return confirm({
      title: "Remplacer Pennylane par Qonto ?",
      description:
        "Une seule intégration de facturation est active à la fois. La connexion Pennylane sera déconnectée.",
      confirmLabel: "Connecter Qonto",
      variant: "danger",
    });
  };

  const oauthStartMutation = useMutation({
    mutationFn: () => integrationsApi.startQontoOAuth(),
    onSuccess: ({ authorizationUrl }) => {
      window.location.assign(authorizationUrl);
    },
    onError: (err: Error) => showToast(err.message, "error"),
  });

  const connectMutation = useMutation({
    mutationFn: () => integrationsApi.connectQonto(login, secretKey),
    onSuccess: () => {
      setLogin("");
      setSecretKey("");
      setShowKeyForm(false);
      invalidateBillingIntegrations();
      showToast("Qonto connecté.");
    },
    onError: (err: Error) => showToast(err.message, "error"),
  });

  const disconnectMutation = useMutation({
    mutationFn: () => integrationsApi.disconnectQonto(),
    onSuccess: () => {
      invalidateBillingIntegrations();
      showToast("Qonto déconnecté.");
    },
    onError: (err: Error) => showToast(err.message, "error"),
  });

  if (!canRead) return null;

  const oauthAvailable = Boolean(status?.oauthAvailable);
  const authLabel =
    status?.authMethod === "oauth"
      ? "via OAuth"
      : status?.authMethod === "api_token"
        ? "via clé API"
        : "";

  return (
    <section className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5 shadow-sm space-y-4">
      <div className="flex gap-3">
        <IntegrationProviderLogo provider="qonto" />
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100">Qonto</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Connectez votre compte Qonto pour créer une facture brouillon depuis un dossier « À
            facturer », sans ressaisir les lignes.
          </p>
        </div>
      </div>

      {isLoading ? (
        <p className="text-sm text-slate-500">Chargement…</p>
      ) : status?.connected ? (
        <div className="space-y-3">
          <div className="rounded-lg border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50 dark:bg-emerald-950/30 px-3 py-2 text-sm text-emerald-800 dark:text-emerald-200">
            Connecté
            {status.companyName ? ` — ${status.companyName}` : ""}
            {authLabel ? ` (${authLabel})` : ""}
            {status.tokenHint ? ` ${status.tokenHint}` : ""}
          </div>
          {canConfigure && (
            <button
              type="button"
              disabled={disconnectMutation.isPending}
              onClick={async () => {
                const ok = await confirm({
                  title: "Déconnecter Qonto ?",
                  description: "La connexion Qonto de cette organisation sera supprimée.",
                  confirmLabel: "Déconnecter",
                  variant: "danger",
                });
                if (ok) disconnectMutation.mutate();
              }}
              className="rounded-lg border border-slate-200 dark:border-slate-600 px-3 py-1.5 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50"
            >
              {disconnectMutation.isPending ? "Déconnexion…" : "Déconnecter"}
            </button>
          )}
        </div>
      ) : canConfigure ? (
        <div className="space-y-4">
          {oauthAvailable ? (
            <>
              <button
                type="button"
                disabled={oauthStartMutation.isPending}
                onClick={async () => {
                  if (!(await confirmReplaceOther())) return;
                  oauthStartMutation.mutate();
                }}
                className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-500 disabled:opacity-50"
              >
                {oauthStartMutation.isPending ? "Redirection…" : "Connecter avec Qonto"}
              </button>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Vous serez redirigé vers Qonto pour autoriser Planwise, puis ramené ici.
              </p>
              <div>
                <button
                  type="button"
                  onClick={() => setShowKeyForm((v) => !v)}
                  className="text-xs text-slate-500 underline-offset-2 hover:underline dark:text-slate-400"
                >
                  {showKeyForm
                    ? "Masquer la connexion par clé API"
                    : "Ou connecter avec une clé API"}
                </button>
              </div>
            </>
          ) : null}

          {(!oauthAvailable || showKeyForm) && (
            <form
              className="space-y-3"
              onSubmit={async (e) => {
                e.preventDefault();
                if (!login.trim() || !secretKey.trim()) {
                  showToast("Indiquez le login et la clé secrète Qonto.", "error");
                  return;
                }
                if (!(await confirmReplaceOther())) return;
                connectMutation.mutate();
              }}
            >
              {!oauthAvailable && (
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  OAuth n’est pas encore activé sur cette instance. Utilisez une clé API Qonto en
                  attendant.
                </p>
              )}
              <div>
                <label
                  htmlFor="qonto-login"
                  className="block text-xs font-medium text-slate-600 dark:text-slate-300"
                >
                  Login API
                </label>
                <input
                  id="qonto-login"
                  type="text"
                  autoComplete="off"
                  value={login}
                  onChange={(e) => setLogin(e.target.value)}
                  placeholder="Identifiant de connexion Qonto"
                  className="mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-950 px-3 py-2 text-sm text-slate-900 dark:text-slate-100"
                />
              </div>
              <div>
                <label
                  htmlFor="qonto-secret"
                  className="block text-xs font-medium text-slate-600 dark:text-slate-300"
                >
                  Clé secrète
                </label>
                <input
                  id="qonto-secret"
                  type="password"
                  autoComplete="off"
                  value={secretKey}
                  onChange={(e) => setSecretKey(e.target.value)}
                  placeholder="Secret key"
                  className="mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-950 px-3 py-2 text-sm text-slate-900 dark:text-slate-100"
                />
                <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                  Qonto → Paramètres → Intégrations API. Conservé chiffré pour votre organisation.
                </p>
              </div>
              <button
                type="submit"
                disabled={connectMutation.isPending}
                className="rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-500 disabled:opacity-50"
              >
                {connectMutation.isPending ? "Connexion…" : "Connecter Qonto"}
              </button>
            </form>
          )}
        </div>
      ) : (
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Aucune connexion Qonto. Demandez à un administrateur de la configurer.
        </p>
      )}
    </section>
  );
}
