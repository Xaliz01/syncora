"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { BASE_SUBSCRIPTION_PLAN } from "@planwise/shared";
import { useAuth } from "@/components/auth/AuthContext";
import * as accountApi from "@/lib/account.api";
import {
  injectTrialTestData,
  invalidateQueriesAfterDemoDataChange,
} from "@/lib/trial-test-data.api";
import { useToast } from "@/components/ui/ToastProvider";
import { LANDING_TAGLINE } from "@/lib/landing-copy";

type OnboardingStep = "profile" | "demo-data";

export function OnboardingProfilePage() {
  const { user, refreshSession } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [step, setStep] = useState<OnboardingStep>("profile");
  const [goesOnInterventions, setGoesOnInterventions] = useState<boolean | null>(null);
  const [loading, setLoading] = useState<"inject" | "skip" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const prefsQueryKey = ["account-preferences", user?.id, user?.organizationId] as const;
  const finishingRef = React.useRef(false);

  const { data: prefsSnapshot } = useQuery({
    queryKey: prefsQueryKey,
    queryFn: () => accountApi.getPreferences(),
    enabled: Boolean(user?.id && user?.organizationId),
    staleTime: 30_000,
  });

  // Si l’onboarding est déjà fait (ex. URL directe), renvoyer vers le tableau de bord.
  React.useEffect(() => {
    if (finishingRef.current) return;
    if (!user) return;
    if (prefsSnapshot?.preferences.onboardingProfileCompleted !== true) return;
    router.replace("/");
  }, [prefsSnapshot, user, router]);

  const chooseProfile = (field: boolean) => {
    setGoesOnInterventions(field);
    setError(null);
    setStep("demo-data");
  };

  const cacheCompletedPreferences = (
    preferences: Awaited<ReturnType<typeof accountApi.completeOnboardingProfile>>["preferences"],
  ) => {
    if (!user) return;
    queryClient.setQueryData(prefsQueryKey, {
      userId: user.id,
      preferences,
    });
    void queryClient.invalidateQueries({ queryKey: ["account-preferences"] });
  };

  const completeProfileOnServer = async () => {
    if (goesOnInterventions === null) throw new Error("Profil non choisi");
    return accountApi.completeOnboardingProfile({
      goesOnInterventions,
    });
  };

  const finish = async (injectDemo: boolean) => {
    if (goesOnInterventions === null) return;
    finishingRef.current = true;
    setLoading(injectDemo ? "inject" : "skip");
    setError(null);
    try {
      const result = await completeProfileOnServer();

      let demoStarted = false;
      if (injectDemo) {
        try {
          await injectTrialTestData();
          demoStarted = true;
          void queryClient.invalidateQueries({ queryKey: ["trial-test-data", "status"] });
          void invalidateQueriesAfterDemoDataChange(queryClient);
        } catch (injectErr) {
          showToast(
            injectErr instanceof Error
              ? injectErr.message
              : "Profil enregistré, mais l'injection des données de démo a échoué. Vous pourrez réessayer depuis le tableau de bord.",
            "error",
          );
        }
      }

      await refreshSession();
      cacheCompletedPreferences(result.preferences);
      router.replace("/");

      if (demoStarted) {
        showToast(
          "Profil enregistré. L'injection des données de démonstration est en cours.",
          "success",
        );
      } else if (!injectDemo) {
        showToast(
          goesOnInterventions
            ? "Profil enregistré. Vous pouvez être assigné sur des interventions."
            : "Profil enregistré.",
          "success",
        );
      }
    } catch (err) {
      finishingRef.current = false;
      setError(err instanceof Error ? err.message : "Impossible d'enregistrer votre choix");
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950">
      <header className="border-b border-slate-200 dark:border-slate-700 bg-white/95 dark:bg-slate-900/95 backdrop-blur">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center gap-2">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white font-semibold">
            P
          </span>
          <div>
            <div className="font-semibold text-lg text-slate-900 dark:text-slate-100">Planwise</div>
            <div className="text-xs text-slate-500 dark:text-slate-400">{LANDING_TAGLINE}</div>
          </div>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-lg">
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-600 dark:text-brand-400 mb-2">
            Première connexion · étape {step === "profile" ? "1" : "2"} sur 2
          </p>

          {step === "profile" ? (
            <>
              <h1 className="text-2xl sm:text-3xl font-semibold text-slate-900 dark:text-slate-100 mb-2">
                Comment utilisez-vous Planwise&nbsp;?
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-8 leading-relaxed">
                {user?.name ? (
                  <>
                    Bonjour{" "}
                    <span className="font-medium text-slate-700 dark:text-slate-200">
                      {user.name}
                    </span>
                    .{" "}
                  </>
                ) : null}
                Pour assigner des interventions, un technicien doit être lié à votre compte
                utilisateur si vous allez sur le terrain.
              </p>

              {error && (
                <div className="mb-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm p-3">
                  {error}
                </div>
              )}

              <div className="grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  disabled={loading !== null}
                  onClick={() => chooseProfile(true)}
                  className="rounded-xl border border-brand-200 dark:border-brand-500/40 bg-white dark:bg-slate-900 p-5 text-left hover:border-brand-500 hover:bg-brand-50/50 dark:hover:bg-brand-950/30 transition disabled:opacity-50"
                >
                  <p className="font-semibold text-slate-900 dark:text-slate-100 mb-1">
                    Je vais aussi sur le terrain
                  </p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Crée un technicien associé à votre compte pour les interventions et permet de
                    tester la page «&nbsp;Ma journée&nbsp;».
                  </p>
                </button>

                <button
                  type="button"
                  disabled={loading !== null}
                  onClick={() => chooseProfile(false)}
                  className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5 text-left hover:border-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition disabled:opacity-50"
                >
                  <p className="font-semibold text-slate-900 dark:text-slate-100 mb-1">
                    Bureau uniquement
                  </p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Vous planifiez et suivez sans intervenir vous-même. Vous pourrez lier un
                    technicien plus tard.
                  </p>
                </button>
              </div>
            </>
          ) : (
            <>
              <h1 className="text-2xl sm:text-3xl font-semibold text-slate-900 dark:text-slate-100 mb-2">
                Charger des données de démonstration&nbsp;?
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-4 leading-relaxed">
                Pour découvrir Planwise rapidement, vous pouvez injecter un jeu de données fictives
                en un clic. Elles alimentent clients, dossiers, interventions, techniciens, stock,
                etc., et une partie vous est assignée pour peupler le tableau de bord et «&nbsp;Ma
                journée&nbsp;» si vous avez mentionné que vous allez sur le terrain.
              </p>

              <ul className="mb-6 space-y-2 text-sm text-slate-600 dark:text-slate-300">
                <li className="flex gap-2">
                  <span className="text-brand-600 dark:text-brand-400 shrink-0" aria-hidden>
                    •
                  </span>
                  <span>
                    Toutes les données sont marquées «&nbsp;Démo&nbsp;» et ne remplacent pas vos
                    vraies données.
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="text-brand-600 dark:text-brand-400 shrink-0" aria-hidden>
                    •
                  </span>
                  <span>Vous pouvez les supprimer à tout moment depuis le tableau de bord.</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-brand-600 dark:text-brand-400 shrink-0" aria-hidden>
                    •
                  </span>
                  <span>
                    Elles sont automatiquement supprimées à la fin de votre période d&apos;essai (
                    {BASE_SUBSCRIPTION_PLAN.trialDays} jours).
                  </span>
                </li>
              </ul>

              {error && (
                <div className="mb-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm p-3">
                  {error}
                </div>
              )}

              <div className="grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  disabled={loading !== null}
                  onClick={() => void finish(true)}
                  className="rounded-xl border border-brand-200 dark:border-brand-500/40 bg-brand-600 p-5 text-left text-white hover:bg-brand-500 transition disabled:opacity-50"
                >
                  <p className="font-semibold mb-1">Injecter les données de démo</p>
                  <p className="text-sm text-brand-100">
                    L&apos;injection se lance en arrière-plan ; un guide de bienvenue vous attend
                    dans l&apos;app.
                  </p>
                  {loading === "inject" && (
                    <p className="mt-3 text-xs font-medium text-brand-100">Enregistrement…</p>
                  )}
                </button>

                <button
                  type="button"
                  disabled={loading !== null}
                  onClick={() => void finish(false)}
                  className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5 text-left hover:border-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition disabled:opacity-50"
                >
                  <p className="font-semibold text-slate-900 dark:text-slate-100 mb-1">
                    Continuer sans données de démo
                  </p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Entrez dans l&apos;app : un guide de bienvenue vous proposera les premiers pas.
                  </p>
                  {loading === "skip" && (
                    <p className="mt-3 text-xs font-medium text-slate-500">Enregistrement…</p>
                  )}
                </button>
              </div>

              <button
                type="button"
                disabled={loading !== null}
                onClick={() => {
                  setError(null);
                  setStep("profile");
                }}
                className="mt-4 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 underline-offset-2 hover:underline disabled:opacity-50"
              >
                ← Retour
              </button>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
