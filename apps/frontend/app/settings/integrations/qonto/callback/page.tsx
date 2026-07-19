"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { AppShell } from "@/components/layout/AppShell";
import { useToast } from "@/components/ui/ToastProvider";
import { completeQontoOAuth } from "@/lib/integrations.api";

function QontoCallbackInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast } = useToast();
  const started = useRef(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const oauthError = searchParams.get("error");
    const oauthDesc = searchParams.get("error_description");

    if (oauthError) {
      setError(oauthDesc || oauthError || "Autorisation Qonto refusée.");
      return;
    }
    if (!code || !state) {
      setError("Réponse OAuth incomplète (code ou state manquant).");
      return;
    }

    void completeQontoOAuth(code, state)
      .then(() => {
        showToast("Qonto connecté.");
        router.replace("/settings/integrations");
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Connexion Qonto impossible.");
      });
  }, [router, searchParams, showToast]);

  return (
    <div className="mx-auto max-w-lg px-4 py-16 text-center">
      {error ? (
        <div className="space-y-4">
          <h1 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
            Connexion Qonto échouée
          </h1>
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          <button
            type="button"
            onClick={() => router.replace("/settings/integrations")}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-500"
          >
            Retour aux intégrations
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          <h1 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
            Connexion à Qonto…
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Finalisation de l’autorisation, un instant.
          </p>
        </div>
      )}
    </div>
  );
}

export default function QontoOAuthCallbackPage() {
  return (
    <RequireAuth>
      <AppShell>
        <Suspense
          fallback={
            <div className="mx-auto max-w-lg px-4 py-16 text-center text-sm text-slate-500">
              Chargement…
            </div>
          }
        >
          <QontoCallbackInner />
        </Suspense>
      </AppShell>
    </RequireAuth>
  );
}
