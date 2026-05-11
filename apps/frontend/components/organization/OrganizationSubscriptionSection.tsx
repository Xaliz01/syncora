"use client";

import { Suspense, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/components/auth/AuthContext";
import { useToast } from "@/components/ui/ToastProvider";
import * as subscriptionsApi from "@/lib/subscriptions.api";
import { hasPermission } from "@/lib/auth-permissions";

const STATUS_LABELS: Record<string, string> = {
  none: "Aucun abonnement actif",
  trialing: "Période d’essai",
  active: "Abonnement actif",
  past_due: "Paiement en retard",
  canceled: "Abonnement annulé",
  unpaid: "Impayé",
  incomplete: "Paiement incomplet",
  incomplete_expired: "Paiement expiré"
};

const FEATURE_HIGHLIGHTS = [
  {
    title: "Dossiers et interventions centralisés",
    description: "Suivez chaque dossier, son avancement, ses tâches et son historique depuis un seul endroit."
  },
  {
    title: "Planning terrain fluide",
    description: "Planifiez, glissez-déposez, et réorganisez les interventions en quelques secondes."
  },
  {
    title: "Flotte et équipes alignées",
    description: "Pilotez équipes, techniciens, agences et véhicules avec une vue opérationnelle cohérente."
  },
  {
    title: "Clients et facturation mieux maîtrisés",
    description: "Retrouvez vos clients rapidement et sécurisez les accès via des permissions adaptées."
  }
];

function OrganizationSubscriptionSectionInner({
  mode = "full"
}: {
  mode?: "full" | "pitchCheckout";
}) {
  const pitchCheckout = mode === "pitchCheckout";
  const { user, refreshSession } = useAuth();
  const { showToast } = useToast();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();

  const checkout = searchParams.get("checkout");

  useEffect(() => {
    if (checkout === "success") {
      showToast("Paiement ou abonnement mis à jour. Les données peuvent prendre quelques secondes.");
      void queryClient.invalidateQueries({ queryKey: ["subscription-current"] });
      void queryClient.invalidateQueries({ queryKey: ["organizations", "mine"] });
      void refreshSession();
      if (typeof window !== "undefined") {
        window.history.replaceState(null, "", "/organization");
      }
    } else if (checkout === "canceled") {
      showToast("Paiement annulé.");
      if (typeof window !== "undefined") {
        window.history.replaceState(null, "", "/organization");
      }
    }
  }, [checkout, queryClient, refreshSession, showToast]);

  const { data: subscription, isLoading, error } = useQuery({
    queryKey: ["subscription-current"],
    queryFn: () => subscriptionsApi.getSubscriptionCurrent()
  });

  const checkoutMutation = useMutation({
    mutationFn: () => {
      const origin = window.location.origin;
      return subscriptionsApi.createCheckoutSession({
        customerEmail: user?.email,
        successUrl: `${origin}/organization?checkout=success`,
        cancelUrl: `${origin}/organization?checkout=canceled`
      });
    },
    onSuccess: (res) => {
      window.location.href = res.url;
    },
    onError: (err: Error) => {
      showToast(err.message ?? "Impossible d’ouvrir le paiement Stripe.");
    }
  });

  const portalMutation = useMutation({
    mutationFn: () => {
      const origin = window.location.origin;
      return subscriptionsApi.createBillingPortalSession({
        returnUrl: `${origin}/organization`
      });
    },
    onSuccess: (res) => {
      window.location.href = res.url;
    },
    onError: (err: Error) => {
      showToast(err.message ?? "Impossible d’ouvrir le portail de facturation.");
    }
  });

  const canManageBilling = hasPermission(user, "subscriptions.manage_billing");
  const statusLabel =
    subscription && STATUS_LABELS[subscription.status]
      ? STATUS_LABELS[subscription.status]
      : subscription?.status ?? "—";

  const showPrimaryCheckout =
    subscription &&
    (subscription.status === "none" ||
      subscription.status === "incomplete" ||
      subscription.status === "incomplete_expired");

  const heroCard = (
    <div
      className={`rounded-2xl border border-brand-200/70 dark:border-brand-500/30 bg-gradient-to-br from-brand-50 via-white to-indigo-50 dark:from-slate-900 dark:via-slate-900 dark:to-indigo-950/30 p-4 sm:p-5 ${pitchCheckout ? "" : "mb-5"}`}
    >
      <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr] items-start">
        <div>
          <h2 className="text-lg sm:text-xl font-semibold text-slate-900 dark:text-slate-100">
            Passez en mode pilotage complet de votre activité
          </h2>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
            Syncora vous aide à mieux organiser vos opérations terrain, réduire les oublis et livrer plus vite.
            Essayez, mesurez l’impact, puis activez votre abonnement sans engagement.
          </p>

          <div className="mt-4 flex flex-wrap items-end gap-x-3 gap-y-1">
            <p className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100">
              {subscription?.planLabel?.split("/")[0]?.trim() ?? "9,99 €"}
            </p>
            <p className="text-sm text-slate-500 dark:text-slate-400">/ mois • sans engagement</p>
          </div>

          <ul className="mt-4 space-y-2">
            {FEATURE_HIGHLIGHTS.map((feature) => (
              <li
                key={feature.title}
                className="rounded-xl border border-slate-200/80 dark:border-slate-700 bg-white/70 dark:bg-slate-900/70 p-3"
              >
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{feature.title}</p>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">{feature.description}</p>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-3">Aperçu de valeur</p>
          <div className="space-y-3">
            <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 p-3">
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Productivité terrain</p>
              <p className="text-lg font-semibold text-slate-900 dark:text-slate-100 mt-1">+20% interventions planifiées</p>
            </div>
            <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 p-3">
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Réactivité client</p>
              <p className="text-lg font-semibold text-slate-900 dark:text-slate-100 mt-1">Recherche globale instantanée</p>
            </div>
            <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 p-3">
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Maîtrise des opérations</p>
              <p className="text-lg font-semibold text-slate-900 dark:text-slate-100 mt-1">Dossiers, flotte, stock unifiés</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const pitchCheckoutActions = (
    <div className="mt-6">
      {isLoading && (
        <p className="text-sm text-slate-500 dark:text-slate-400 text-center sm:text-left">Préparation du paiement…</p>
      )}
      {error && (
        <div className="rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200 text-sm p-3">
          {(error as Error).message}
        </div>
      )}
      {!isLoading && !error && subscription && canManageBilling && showPrimaryCheckout && (
        <div className="flex flex-wrap gap-3 justify-center sm:justify-start">
          <button
            type="button"
            onClick={() => checkoutMutation.mutate()}
            disabled={checkoutMutation.isPending}
            className="rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-500 disabled:opacity-50 transition"
          >
            {subscription.status === "none" ? "Activer l’essai ou s’abonner" : "Finaliser ou recommencer le paiement"}
          </button>
        </div>
      )}
      {!isLoading && !error && subscription && !canManageBilling && (
        <p className="text-sm text-center sm:text-left text-slate-500 dark:text-slate-400">
          Seuls les utilisateurs autorisés à gérer la facturation peuvent lancer l’activation ou le paiement.
        </p>
      )}
    </div>
  );

  return (
    <section className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5 shadow-sm dark:shadow-slate-950/20">
      {/* Pitch marketing réservé au plein écran d’activation (SubscriptionGateScreen), pas à la fiche org déjà abonnée */}
      {pitchCheckout && heroCard}

      {pitchCheckout ? (
        pitchCheckoutActions
      ) : (
        <>
          <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-1">Statut de l’abonnement</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
            {subscription?.planLabel ?? "9,99 € / mois, sans engagement"}
          </p>

          {isLoading && <p className="text-sm text-slate-500 dark:text-slate-400">Chargement du statut…</p>}

          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 text-red-800 text-sm p-3">
              {(error as Error).message}
            </div>
          )}

          {!isLoading && !error && subscription && (
            <>
              {!subscription.hasAccess && subscription.status !== "none" && (
                <div className="rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-sm p-3 mb-4">
                  Votre organisation n’a pas accès actif au service selon le statut de facturation Stripe.
                </div>
              )}

              <dl className="grid gap-3 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-slate-500 dark:text-slate-400">Statut</dt>
                  <dd className="font-medium text-slate-900 dark:text-slate-100 mt-0.5">{statusLabel}</dd>
                </div>
                {subscription.trialEndsAt && (
                  <div className="sm:col-span-2">
                    <dt className="text-slate-500 dark:text-slate-400">Fin de l’essai</dt>
                    <dd className="font-medium text-slate-900 dark:text-slate-100 mt-0.5">
                      {new Date(subscription.trialEndsAt).toLocaleString("fr-FR", {
                        dateStyle: "long",
                        timeStyle: "short"
                      })}
                    </dd>
                  </div>
                )}
                {subscription.currentPeriodEnd && subscription.status !== "none" && (
                  <div className="sm:col-span-2">
                    <dt className="text-slate-500 dark:text-slate-400">Fin de période en cours</dt>
                    <dd className="font-medium text-slate-900 dark:text-slate-100 mt-0.5">
                      {new Date(subscription.currentPeriodEnd).toLocaleString("fr-FR", {
                        dateStyle: "long",
                        timeStyle: "short"
                      })}
                    </dd>
                  </div>
                )}
                {subscription.cancelAtPeriodEnd && (
                  <div className="sm:col-span-2 text-amber-800 text-sm">
                    L’abonnement prendra fin à la date indiquée ci-dessus (sans renouvellement).
                  </div>
                )}
              </dl>

              {canManageBilling && (
                <div className="flex flex-wrap gap-3 mt-6 pt-4 border-t border-slate-100 dark:border-slate-800">
                  {(subscription.status === "none" ||
                    subscription.status === "incomplete" ||
                    subscription.status === "incomplete_expired") && (
                    <button
                      type="button"
                      onClick={() => checkoutMutation.mutate()}
                      disabled={checkoutMutation.isPending}
                      className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-500 disabled:opacity-50 transition"
                    >
                      {subscription.status === "none"
                        ? "Activer l’essai ou s’abonner"
                        : "Finaliser ou recommencer le paiement"}
                    </button>
                  )}
                  {subscription.status !== "none" && (
                    <button
                      type="button"
                      onClick={() => portalMutation.mutate()}
                      disabled={portalMutation.isPending}
                      className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 transition"
                    >
                      Facturation, moyen de paiement et résiliation
                    </button>
                  )}
                </div>
              )}

              {!canManageBilling && (
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                  Seuls les utilisateurs autorisés à gérer la facturation peuvent lancer le paiement ou ouvrir le portail Stripe.
                </p>
              )}
            </>
          )}
        </>
      )}
    </section>
  );
}

export function OrganizationSubscriptionSection({
  mode = "full"
}: {
  mode?: "full" | "pitchCheckout";
}) {
  return (
    <Suspense
      fallback={
        <section className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5 shadow-sm dark:shadow-slate-950/20">
          <p className="text-sm text-slate-500 dark:text-slate-400">Chargement de l’abonnement…</p>
        </section>
      }
    >
      <OrganizationSubscriptionSectionInner mode={mode} />
    </Suspense>
  );
}
