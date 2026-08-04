"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/components/auth/AuthContext";
import { hasPermission } from "@/lib/auth-permissions";
import { hasActiveSubscriptionAccess } from "@/lib/subscription-access";
import * as accountApi from "@/lib/account.api";
import {
  getTrialTestDataStatus,
  injectTrialTestData,
  invalidateQueriesAfterDemoDataChange,
} from "@/lib/trial-test-data.api";
import { useToast } from "@/components/ui/ToastProvider";

function useBodyScrollLock(locked: boolean) {
  useEffect(() => {
    if (!locked) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [locked]);
}

type SetupActionId = "customer" | "invite" | "case" | "demo" | "billing";

/**
 * Guide de bienvenue in-app (fondateur admin) après l’onboarding.
 * Skippable ; chaque action mène vers un parcours concret.
 * L’action « données de démo » est masquée si une injection est déjà en cours / prête.
 */
export function SetupGuideHost() {
  const { user, isAuthenticated, isReady } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [dismissing, setDismissing] = useState(false);
  const [injecting, setInjecting] = useState(false);

  const eligible =
    isReady &&
    isAuthenticated &&
    Boolean(user?.isFoundingAdmin) &&
    hasActiveSubscriptionAccess(user);

  const prefsQueryKey = ["account-preferences", user?.id, user?.organizationId] as const;

  const { data: prefsData, isLoading: prefsLoading } = useQuery({
    queryKey: prefsQueryKey,
    queryFn: () => accountApi.getPreferences(),
    enabled: eligible,
    staleTime: 30_000,
  });

  const { data: demoStatus } = useQuery({
    queryKey: ["trial-test-data", "status"],
    queryFn: () => getTrialTestDataStatus(),
    enabled: eligible,
    staleTime: 10_000,
  });

  const onboardingDone = prefsData?.preferences.onboardingProfileCompleted === true;
  const setupDismissed = prefsData?.preferences.setupGuideDismissed === true;
  const open = Boolean(eligible && !prefsLoading && onboardingDone && !setupDismissed);

  const demoAlreadyLoaded =
    demoStatus?.status === "injecting" ||
    demoStatus?.status === "ready" ||
    demoStatus?.hasTestData === true;

  useBodyScrollLock(open);

  const dismiss = useCallback(async () => {
    if (dismissing || injecting) return;
    setDismissing(true);
    try {
      const res = await accountApi.updatePreferences({ setupGuideDismissed: true });
      queryClient.setQueryData(prefsQueryKey, {
        userId: user?.id,
        preferences: res.preferences,
      });
      void queryClient.invalidateQueries({ queryKey: ["account-preferences"] });
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Impossible de masquer le guide pour le moment.",
        "error",
      );
    } finally {
      setDismissing(false);
    }
  }, [dismissing, injecting, prefsQueryKey, queryClient, showToast, user?.id]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") void dismiss();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, dismiss]);

  const runAction = async (id: SetupActionId) => {
    if (id === "demo") {
      setInjecting(true);
      try {
        await injectTrialTestData();
        void queryClient.invalidateQueries({ queryKey: ["trial-test-data", "status"] });
        void invalidateQueriesAfterDemoDataChange(queryClient);
        showToast("Injection des données de démonstration en cours.", "success");
      } catch (err) {
        showToast(
          err instanceof Error ? err.message : "Impossible d'injecter les données de démo.",
          "error",
        );
      } finally {
        setInjecting(false);
      }
      return;
    }

    await dismiss();
    if (id === "customer") router.push("/customers/new");
    else if (id === "invite") router.push("/users/new");
    else if (id === "case") router.push("/cases/new");
    else if (id === "billing") router.push("/settings/integrations");
  };

  if (!open) return null;

  const actions: {
    id: SetupActionId;
    title: string;
    description: string;
    visible: boolean;
  }[] = [
    {
      id: "customer",
      title: "Créer un premier client",
      description: "Posez la base pour planifier une intervention réelle.",
      visible: hasPermission(user, "customers.create"),
    },
    {
      id: "case",
      title: "Créer un dossier",
      description: "Ouvrez un chantier ou une demande client.",
      visible: hasPermission(user, "cases.create"),
    },
    {
      id: "invite",
      title: "Inviter un collègue",
      description: "Ajoutez un membre à votre organisation.",
      visible: hasPermission(user, "users.invite"),
    },
    {
      id: "demo",
      title: "Charger des données de démo",
      description: "Peuplez l’app avec des exemples pour explorer rapidement.",
      visible: !demoAlreadyLoaded,
    },
    {
      id: "billing",
      title: "Connecter son outil de facturation",
      description: "Pennylane, Qonto, ou facturation démo pendant l’essai.",
      visible:
        hasPermission(user, "integrations.pennylane.read") ||
        hasPermission(user, "integrations.qonto.read") ||
        hasPermission(user, "integrations.demo.read") ||
        hasPermission(user, "integrations.pennylane.configure") ||
        hasPermission(user, "integrations.qonto.configure") ||
        hasPermission(user, "integrations.demo.configure"),
    },
  ];

  const visibleActions = actions.filter((a) => a.visible);
  const busy = dismissing || injecting;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-slate-950/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="setup-guide-title"
      onClick={() => void dismiss()}
    >
      <div
        className="w-full max-w-lg rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xl p-5 sm:p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-xs font-semibold uppercase tracking-wide text-brand-600 dark:text-brand-400 mb-2">
          Bienvenue
        </p>
        <h2
          id="setup-guide-title"
          className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-1"
        >
          Bienvenue dans Planwise
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-5 leading-relaxed">
          Choisissez une action pour configurer votre espace, ou explorez librement. Vous pourrez
          toujours y revenir plus tard depuis les menus.
        </p>

        <div className="grid gap-2">
          {visibleActions.map((action) => (
            <button
              key={action.id}
              type="button"
              disabled={busy}
              onClick={() => void runAction(action.id)}
              className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950/40 p-4 text-left hover:border-brand-500 hover:bg-brand-50/40 dark:hover:bg-brand-950/20 transition disabled:opacity-50"
            >
              <p className="font-semibold text-slate-900 dark:text-slate-100 mb-0.5">
                {action.title}
              </p>
              <p className="text-sm text-slate-500 dark:text-slate-400">{action.description}</p>
              {action.id === "demo" && injecting ? (
                <p className="mt-2 text-xs font-medium text-brand-600 dark:text-brand-400">
                  Injection…
                </p>
              ) : null}
            </button>
          ))}
        </div>

        <button
          type="button"
          disabled={busy}
          onClick={() => void dismiss()}
          className="mt-4 w-full rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-2.5 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition disabled:opacity-50"
        >
          {dismissing ? "Fermeture…" : "Passer pour l’instant"}
        </button>
      </div>
    </div>
  );
}
