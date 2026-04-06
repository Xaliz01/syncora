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

function OrganizationSubscriptionSectionInner() {
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

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-sm font-semibold text-slate-800 mb-1">Abonnement</h2>
      <p className="text-xs text-slate-500 mb-4">{subscription?.planLabel ?? "9,99 € / mois, sans engagement"}</p>

      {isLoading && <p className="text-sm text-slate-500">Chargement du statut…</p>}

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
              <dt className="text-slate-500">Statut</dt>
              <dd className="font-medium text-slate-900 mt-0.5">{statusLabel}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Accès application</dt>
              <dd className="font-medium mt-0.5">
                {subscription.hasAccess ? (
                  <span className="text-emerald-700">Oui</span>
                ) : (
                  <span className="text-slate-600">Non</span>
                )}
              </dd>
            </div>
            {subscription.trialEndsAt && (
              <div className="sm:col-span-2">
                <dt className="text-slate-500">Fin de l’essai</dt>
                <dd className="font-medium text-slate-900 mt-0.5">
                  {new Date(subscription.trialEndsAt).toLocaleString("fr-FR", {
                    dateStyle: "long",
                    timeStyle: "short"
                  })}
                </dd>
              </div>
            )}
            {subscription.currentPeriodEnd && subscription.status !== "none" && (
              <div className="sm:col-span-2">
                <dt className="text-slate-500">Fin de période en cours</dt>
                <dd className="font-medium text-slate-900 mt-0.5">
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
            <div className="flex flex-wrap gap-3 mt-6 pt-4 border-t border-slate-100">
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
                  className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition"
                >
                  Facturation, moyen de paiement et résiliation
                </button>
              )}
            </div>
          )}

          {!canManageBilling && (
            <p className="text-xs text-slate-500 mt-4 pt-4 border-t border-slate-100">
              Seuls les utilisateurs autorisés à gérer la facturation peuvent lancer le paiement ou ouvrir le portail Stripe.
            </p>
          )}
        </>
      )}
    </section>
  );
}

export function OrganizationSubscriptionSection() {
  return (
    <Suspense
      fallback={
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Chargement de l’abonnement…</p>
        </section>
      }
    >
      <OrganizationSubscriptionSectionInner />
    </Suspense>
  );
}
