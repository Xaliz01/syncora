"use client";

import { useAuth } from "@/components/auth/AuthContext";
import { SubscriptionSection } from "@/components/subscription/SubscriptionSection";
import { BetaBadge } from "@/components/ui/BetaBadge";
import { hasActiveSubscriptionAccess } from "@/lib/subscription-access";

export function SubscriptionPage() {
  const { user } = useAuth();
  const subscriptionOk = hasActiveSubscriptionAccess(user);

  return (
    <div className="space-y-8 w-full">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-xl sm:text-2xl font-semibold text-slate-900 dark:text-slate-100">
            Mon abonnement
          </h1>
          <BetaBadge />
        </div>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          {subscriptionOk
            ? "Votre offre Essentiel, vos options complémentaires et la facturation Stripe. Planwise est en beta : certaines fonctionnalités évoluent encore."
            : "Activez votre essai gratuit ou gérez votre abonnement. Planwise est en beta : l’essai peut être prolongé un nombre limité de fois."}
        </p>
      </div>

      <SubscriptionSection mode={subscriptionOk ? "full" : "pitchCheckout"} />
    </div>
  );
}
