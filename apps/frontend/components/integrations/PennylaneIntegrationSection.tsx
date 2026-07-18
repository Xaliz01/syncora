"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/components/auth/AuthContext";
import { useToast } from "@/components/ui/ToastProvider";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { hasPermission } from "@/lib/auth-permissions";
import * as integrationsApi from "@/lib/integrations.api";

export function PennylaneIntegrationSection() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const confirm = useConfirm();
  const queryClient = useQueryClient();
  const canRead = hasPermission(user, "integrations.pennylane.read");
  const canConfigure = hasPermission(user, "integrations.pennylane.configure");

  const [apiToken, setApiToken] = useState("");
  const [showTokenForm, setShowTokenForm] = useState(false);

  const { data: status, isLoading } = useQuery({
    queryKey: ["integrations", "pennylane"],
    queryFn: () => integrationsApi.getPennylaneStatus(),
    enabled: canRead,
  });

  const oauthStartMutation = useMutation({
    mutationFn: () => integrationsApi.startPennylaneOAuth(),
    onSuccess: ({ authorizationUrl }) => {
      window.location.assign(authorizationUrl);
    },
    onError: (err: Error) => showToast(err.message, "error"),
  });

  const connectMutation = useMutation({
    mutationFn: () => integrationsApi.connectPennylane(apiToken),
    onSuccess: () => {
      setApiToken("");
      setShowTokenForm(false);
      queryClient.invalidateQueries({ queryKey: ["integrations", "pennylane"] });
      showToast("Pennylane connecté.");
    },
    onError: (err: Error) => showToast(err.message, "error"),
  });

  const disconnectMutation = useMutation({
    mutationFn: () => integrationsApi.disconnectPennylane(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["integrations", "pennylane"] });
      showToast("Pennylane déconnecté.");
    },
    onError: (err: Error) => showToast(err.message, "error"),
  });

  if (!canRead) return null;

  const oauthAvailable = Boolean(status?.oauthAvailable);
  const authLabel =
    status?.authMethod === "oauth"
      ? "via OAuth"
      : status?.authMethod === "api_token"
        ? "via token API"
        : "";

  return (
    <section className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5 shadow-sm space-y-4">
      <div>
        <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100">Pennylane</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Connectez votre compte Pennylane pour créer une facture brouillon depuis un dossier « À
          facturer », sans ressaisir les lignes.
        </p>
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
                  title: "Déconnecter Pennylane ?",
                  description:
                    "Les dossiers déjà synchronisés ne seront pas supprimés dans Pennylane.",
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
                onClick={() => oauthStartMutation.mutate()}
                className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-500 disabled:opacity-50"
              >
                {oauthStartMutation.isPending ? "Redirection…" : "Connecter avec Pennylane"}
              </button>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Vous serez redirigé vers Pennylane pour autoriser Planwise, puis ramené ici.
              </p>
              <div>
                <button
                  type="button"
                  onClick={() => setShowTokenForm((v) => !v)}
                  className="text-xs text-slate-500 underline-offset-2 hover:underline dark:text-slate-400"
                >
                  {showTokenForm
                    ? "Masquer la connexion par token"
                    : "Ou connecter avec un token API"}
                </button>
              </div>
            </>
          ) : null}

          {(!oauthAvailable || showTokenForm) && (
            <form
              className="space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                if (!apiToken.trim()) {
                  showToast("Indiquez le token API Pennylane.", "error");
                  return;
                }
                connectMutation.mutate();
              }}
            >
              {!oauthAvailable && (
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  OAuth n’est pas encore activé sur cette instance. Utilisez un token API entreprise
                  en attendant.
                </p>
              )}
              <div>
                <label
                  htmlFor="pennylane-token"
                  className="block text-xs font-medium text-slate-600 dark:text-slate-300"
                >
                  Token API entreprise
                </label>
                <input
                  id="pennylane-token"
                  type="password"
                  autoComplete="off"
                  value={apiToken}
                  onChange={(e) => setApiToken(e.target.value)}
                  placeholder="Coller le token Company API"
                  className="mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-950 px-3 py-2 text-sm text-slate-900 dark:text-slate-100"
                />
                <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                  Pennylane → Paramètres → Développeurs → Token API. Conservé chiffré pour votre
                  organisation.
                </p>
              </div>
              <button
                type="submit"
                disabled={connectMutation.isPending}
                className="rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-500 disabled:opacity-50"
              >
                {connectMutation.isPending ? "Connexion…" : "Connecter Pennylane"}
              </button>
            </form>
          )}
        </div>
      ) : (
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Aucune connexion Pennylane. Demandez à un administrateur de la configurer.
        </p>
      )}
    </section>
  );
}
