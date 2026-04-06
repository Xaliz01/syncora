"use client";

import { useAuth } from "@/components/auth/AuthContext";
import { OrganizationSubscriptionSection } from "@/components/organization/OrganizationSubscriptionSection";
import { useOrganization } from "@/lib/organization";

export function OrganizationPage() {
  const { user } = useAuth();
  const { activeOrganization } = useOrganization();
  const displayName = activeOrganization?.name?.trim() || "Organisation";

  return (
    <div className="space-y-8 max-w-3xl">
      <div>
        <h1 className="text-xl sm:text-2xl font-semibold">{displayName}</h1>
        <p className="text-sm text-slate-500 mt-1">
          Informations liées à votre espace et gestion de l’abonnement Syncora.
        </p>
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-800 mb-3">Identifiant organisation</h2>
        <p className="text-xs text-slate-500 mb-2">
          Référence technique de votre organisation (utile pour le support).
        </p>
        <code className="block text-sm bg-slate-50 border border-slate-100 rounded-lg px-3 py-2 font-mono text-slate-800 break-all">
          {user?.organizationId ?? "—"}
        </code>
      </section>

      <OrganizationSubscriptionSection />
    </div>
  );
}
