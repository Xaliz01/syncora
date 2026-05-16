"use client";

import { useAuth } from "@/components/auth/AuthContext";
import { SubscriptionSection } from "@/components/subscription/SubscriptionSection";
import { hasActiveSubscriptionAccess } from "@/lib/subscription-access";

export function SubscriptionPage() {
  const { user } = useAuth();
  const subscriptionOk = hasActiveSubscriptionAccess(user);

  return (
    <div className="space-y-8 w-full">
      <div>
        <h1 className="text-xl sm:text-2xl font-semibold text-slate-900 dark:text-slate-100">
          Mon abonnement
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          {subscriptionOk
            ? "Votre offre Essentiel, vos options complémentaires et la facturation Stripe."
            : "Activez Syncora pour votre organisation et choisissez vos options."}
        </p>
      </div>

      <SubscriptionSection mode={subscriptionOk ? "full" : "pitchCheckout"} />
    </div>
  );
}
