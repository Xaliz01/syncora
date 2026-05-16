"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/components/auth/AuthContext";
import { useToast } from "@/components/ui/ToastProvider";
import * as subscriptionsApi from "@/lib/subscriptions.api";
import { hasPermission } from "@/lib/auth-permissions";
import { ModifySubscriptionAddonsDialog } from "@/components/subscription/ModifySubscriptionAddonsDialog";
import {
  ADDON_CATALOG,
  BASE_SUBSCRIPTION_PLAN,
  isValidAddonCode,
  type AddonCode,
  type OrganizationSubscriptionResponse,
} from "@syncora/shared";

const STATUS_LABELS: Record<string, string> = {
  none: "Non souscrit",
  trialing: "Essai gratuit",
  active: "Actif",
  past_due: "Paiement en retard",
  canceled: "Annulé",
  unpaid: "Impayé",
  incomplete: "Paiement incomplet",
  incomplete_expired: "Paiement expiré",
};

function statusBadgeClass(status: OrganizationSubscriptionResponse["status"]): string {
  switch (status) {
    case "trialing":
      return "bg-brand-100 text-brand-800 dark:bg-brand-950/60 dark:text-brand-200 ring-brand-200/80 dark:ring-brand-700";
    case "active":
      return "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200 ring-emerald-200/80 dark:ring-emerald-800";
    case "past_due":
    case "unpaid":
      return "bg-amber-100 text-amber-900 dark:bg-amber-950/50 dark:text-amber-200 ring-amber-200/80 dark:ring-amber-800";
    case "canceled":
    case "incomplete_expired":
      return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 ring-slate-200/80 dark:ring-slate-600";
    default:
      return "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 ring-slate-200/80 dark:ring-slate-600";
  }
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("fr-FR", {
    dateStyle: "long",
    timeStyle: "short",
  });
}

const FEATURE_HIGHLIGHTS = [
  {
    title: "Dossiers et interventions centralisés",
    description:
      "Suivez chaque dossier, son avancement, ses tâches et son historique depuis un seul endroit.",
  },
  {
    title: "Planning terrain fluide",
    description:
      "Planifiez, glissez-déposez, et réorganisez les interventions en quelques secondes.",
  },
  {
    title: "Flotte et équipes alignées",
    description:
      "Pilotez équipes, techniciens, agences et véhicules avec une vue opérationnelle cohérente.",
  },
  {
    title: "Clients et facturation mieux maîtrisés",
    description:
      "Retrouvez vos clients rapidement et sécurisez les accès via des permissions adaptées.",
  },
];

function SubscriptionSectionInner({ mode = "full" }: { mode?: "full" | "pitchCheckout" }) {
  const pitchCheckout = mode === "pitchCheckout";
  const { user, refreshSession } = useAuth();
  const { showToast } = useToast();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const [modifyAddonsOpen, setModifyAddonsOpen] = useState(false);
  const [preselectAddon, setPreselectAddon] = useState<AddonCode | null>(null);

  const checkout = searchParams.get("checkout");
  const modifyParam = searchParams.get("modify");

  useEffect(() => {
    if (checkout === "success") {
      showToast(
        "Paiement ou abonnement mis à jour. Les données peuvent prendre quelques secondes.",
      );
      void queryClient.invalidateQueries({ queryKey: ["subscription-current"] });
      void queryClient.invalidateQueries({ queryKey: ["organizations", "mine"] });
      void refreshSession();
      if (typeof window !== "undefined") {
        window.history.replaceState(null, "", "/subscription");
      }
    } else if (checkout === "canceled") {
      showToast("Paiement annulé.");
      if (typeof window !== "undefined") {
        window.history.replaceState(null, "", "/subscription");
      }
    }
  }, [checkout, queryClient, refreshSession, showToast]);

  const canManageBilling = hasPermission(user, "subscriptions.manage_billing");

  const {
    data: subscription,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["subscription-current"],
    queryFn: () => subscriptionsApi.getSubscriptionCurrent(),
  });

  const checkoutMutation = useMutation({
    mutationFn: () => {
      const origin = window.location.origin;
      return subscriptionsApi.createCheckoutSession({
        customerEmail: user?.email,
        successUrl: `${origin}/subscription?checkout=success`,
        cancelUrl: `${origin}/subscription?checkout=canceled`,
      });
    },
    onSuccess: (res) => {
      window.location.href = res.url;
    },
    onError: (err: Error) => {
      showToast(err.message ?? "Impossible d’ouvrir le paiement Stripe.");
    },
  });

  const portalMutation = useMutation({
    mutationFn: () => {
      const origin = window.location.origin;
      return subscriptionsApi.createBillingPortalSession({
        returnUrl: `${origin}/subscription`,
      });
    },
    onSuccess: (res) => {
      window.location.href = res.url;
    },
    onError: (err: Error) => {
      showToast(err.message ?? "Impossible d’ouvrir le portail de facturation.");
    },
  });

  const canModifyAddons =
    !!subscription &&
    subscription.status !== "none" &&
    subscription.status !== "incomplete" &&
    subscription.status !== "incomplete_expired";
  const statusLabel =
    subscription && STATUS_LABELS[subscription.status]
      ? STATUS_LABELS[subscription.status]
      : (subscription?.status ?? "—");

  const showPrimaryCheckout =
    subscription &&
    (subscription.status === "none" ||
      subscription.status === "incomplete" ||
      subscription.status === "incomplete_expired");

  useEffect(() => {
    if (isLoading || !subscription || !modifyParam || !isValidAddonCode(modifyParam)) {
      return;
    }
    if (!canManageBilling) {
      return;
    }
    setPreselectAddon(modifyParam);
    setModifyAddonsOpen(true);
    if (typeof window !== "undefined") {
      window.history.replaceState(null, "", "/subscription");
    }
  }, [isLoading, subscription, modifyParam, canManageBilling]);

  const closeModifyAddonsDialog = () => {
    setModifyAddonsOpen(false);
    setPreselectAddon(null);
  };

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
            Syncora vous aide à mieux organiser vos opérations terrain, réduire les oublis et livrer
            plus vite. Essayez, mesurez l’impact, puis activez votre abonnement sans engagement.
          </p>

          <div className="mt-4">
            <p className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100">
              {BASE_SUBSCRIPTION_PLAN.name}
            </p>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
              <span className="font-semibold text-slate-900 dark:text-slate-100">
                {BASE_SUBSCRIPTION_PLAN.priceDisplay}
              </span>{" "}
              / {BASE_SUBSCRIPTION_PLAN.periodDisplay} · {BASE_SUBSCRIPTION_PLAN.commitmentDisplay}
            </p>
          </div>

          <ul className="mt-4 space-y-2">
            {FEATURE_HIGHLIGHTS.map((feature) => (
              <li
                key={feature.title}
                className="rounded-xl border border-slate-200/80 dark:border-slate-700 bg-white/70 dark:bg-slate-900/70 p-3"
              >
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                  {feature.title}
                </p>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                  {feature.description}
                </p>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-3">
            Aperçu de valeur
          </p>
          <div className="space-y-3">
            <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 p-3">
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Productivité terrain</p>
              <p className="text-lg font-semibold text-slate-900 dark:text-slate-100 mt-1">
                +20% interventions planifiées
              </p>
            </div>
            <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 p-3">
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Réactivité client</p>
              <p className="text-lg font-semibold text-slate-900 dark:text-slate-100 mt-1">
                Recherche globale instantanée
              </p>
            </div>
            <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 p-3">
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Maîtrise des opérations
              </p>
              <p className="text-lg font-semibold text-slate-900 dark:text-slate-100 mt-1">
                Dossiers, flotte, stock unifiés
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const pitchCheckoutActions = (
    <div className="mt-6">
      {isLoading && (
        <p className="text-sm text-slate-500 dark:text-slate-400 text-center sm:text-left">
          Préparation du paiement…
        </p>
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
            {subscription.status === "none"
              ? "Activer l’essai ou s’abonner"
              : "Finaliser ou recommencer le paiement"}
          </button>
        </div>
      )}
      {!isLoading && !error && subscription && !canManageBilling && (
        <p className="text-sm text-center sm:text-left text-slate-500 dark:text-slate-400">
          Seuls les utilisateurs autorisés à gérer la facturation peuvent lancer l’activation ou le
          paiement.
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
          {isLoading && (
            <p className="text-sm text-slate-500 dark:text-slate-400">Chargement du statut…</p>
          )}

          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 text-red-800 text-sm p-3">
              {(error as Error).message}
            </div>
          )}

          {!isLoading && !error && subscription && (
            <>
              {!subscription.hasAccess && subscription.status !== "none" && (
                <div className="rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-sm p-3 mb-4">
                  Votre organisation n’a pas accès actif au service selon le statut de facturation
                  Stripe.
                </div>
              )}

              <div className="rounded-2xl border border-brand-200/60 dark:border-brand-500/25 bg-gradient-to-br from-brand-50/90 via-white to-indigo-50/50 dark:from-slate-900 dark:via-slate-900 dark:to-indigo-950/20 p-5 sm:p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-xs font-medium uppercase tracking-wider text-brand-700/80 dark:text-brand-300/90">
                      {subscription.status === "none" ? "Offre disponible" : "Offre souscrite"}
                    </p>
                    <p className="mt-1 text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
                      {subscription.planName ?? BASE_SUBSCRIPTION_PLAN.name}
                    </p>
                    <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                      <span className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                        {BASE_SUBSCRIPTION_PLAN.priceDisplay}
                      </span>
                      <span className="text-slate-500 dark:text-slate-400">
                        {" "}
                        / {BASE_SUBSCRIPTION_PLAN.periodDisplay}
                      </span>
                      <span className="block sm:inline sm:before:content-['·'] sm:before:mx-1.5 text-slate-500 dark:text-slate-400">
                        {BASE_SUBSCRIPTION_PLAN.commitmentDisplay}
                      </span>
                    </p>
                  </div>
                  {subscription.status !== "none" && (
                    <span
                      className={`inline-flex shrink-0 items-center rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset ${statusBadgeClass(subscription.status)}`}
                    >
                      {statusLabel}
                    </span>
                  )}
                </div>

                {subscription.status !== "none" && (
                  <div className="mt-5 pt-5 border-t border-brand-200/50 dark:border-slate-700/80">
                    <p className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">
                      Options complémentaires
                    </p>
                    {subscription.activeAddons.length > 0 ? (
                      <ul className="grid gap-2 sm:grid-cols-2">
                        {subscription.activeAddons.map((code) => {
                          const addon = ADDON_CATALOG[code];
                          return (
                            <li
                              key={code}
                              className="rounded-xl border border-white/80 dark:border-slate-700 bg-white/80 dark:bg-slate-900/80 px-3 py-2.5 shadow-sm"
                            >
                              <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                                {addon?.label ?? code}
                              </p>
                              {addon?.priceLabel && (
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                  {addon.priceLabel}
                                </p>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    ) : (
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        Aucune option activée pour le moment.
                      </p>
                    )}
                  </div>
                )}

                {(subscription.trialEndsAt ||
                  (subscription.currentPeriodEnd && subscription.status !== "none") ||
                  subscription.cancelAtPeriodEnd) && (
                  <ul className="mt-5 space-y-2 text-sm text-slate-600 dark:text-slate-300">
                    {subscription.trialEndsAt && (
                      <li className="flex flex-wrap gap-x-2 gap-y-0.5">
                        <span className="text-slate-500 dark:text-slate-400">Fin de l’essai</span>
                        <span className="font-medium text-slate-800 dark:text-slate-100">
                          {formatDate(subscription.trialEndsAt)}
                        </span>
                      </li>
                    )}
                    {subscription.currentPeriodEnd && subscription.status !== "none" && (
                      <li className="flex flex-wrap gap-x-2 gap-y-0.5">
                        <span className="text-slate-500 dark:text-slate-400">
                          Fin de période en cours
                        </span>
                        <span className="font-medium text-slate-800 dark:text-slate-100">
                          {formatDate(subscription.currentPeriodEnd)}
                        </span>
                      </li>
                    )}
                    {subscription.cancelAtPeriodEnd && (
                      <li className="text-amber-800 dark:text-amber-200">
                        Résiliation programmée à la fin de la période en cours.
                      </li>
                    )}
                  </ul>
                )}
              </div>

              {canManageBilling && (
                <div className="flex flex-wrap gap-3 mt-6">
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
                  {canModifyAddons && (
                    <button
                      type="button"
                      onClick={() => {
                        setPreselectAddon(null);
                        setModifyAddonsOpen(true);
                      }}
                      className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-500 transition"
                    >
                      Modifier l’abonnement
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
                  Seuls les utilisateurs autorisés à gérer la facturation peuvent lancer le paiement
                  ou ouvrir le portail Stripe.
                </p>
              )}
            </>
          )}
        </>
      )}

      {subscription && canManageBilling && (
        <ModifySubscriptionAddonsDialog
          open={modifyAddonsOpen}
          onClose={closeModifyAddonsDialog}
          subscription={subscription}
          preselectAddon={preselectAddon ?? undefined}
          canApplyChanges={canModifyAddons}
          onApplied={() => {
            void queryClient.invalidateQueries({ queryKey: ["subscription-current"] });
            void refreshSession();
          }}
        />
      )}
    </section>
  );
}

export function SubscriptionSection({ mode = "full" }: { mode?: "full" | "pitchCheckout" }) {
  return (
    <Suspense
      fallback={
        <section className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5 shadow-sm dark:shadow-slate-950/20">
          <p className="text-sm text-slate-500 dark:text-slate-400">Chargement de l’abonnement…</p>
        </section>
      }
    >
      <SubscriptionSectionInner mode={mode} />
    </Suspense>
  );
}
