"use client";

import { useAuth } from "@/components/auth/AuthContext";
import { OrganizationSubscriptionSection } from "@/components/organization/OrganizationSubscriptionSection";
import { OrganizationSwitcher } from "@/components/organization/OrganizationSwitcher";
import { ThemeToggle } from "@/components/theme/ThemeToggle";

/**
 * Plein écran tant que l’organisation n’a pas `subscription.active`.
 * Seule sortie : déconnexion (ou finalisation du flux Stripe).
 */
export function SubscriptionGateScreen() {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <header className="border-b border-slate-200 bg-white/90 backdrop-blur dark:border-slate-800 dark:bg-slate-900/80">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <div className="flex items-center gap-2.5">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 text-white font-semibold text-sm">
              S
            </span>
            <div>
              <div className="font-semibold text-sm leading-tight text-slate-900 dark:text-slate-100">Syncora</div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
                Activation de l’abonnement
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {user?.email && (
              <span className="hidden text-xs text-slate-500 dark:text-slate-400 sm:inline max-w-[200px] truncate">
                {user.email}
              </span>
            )}
            <ThemeToggle />
            <button
              type="button"
              onClick={logout}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 transition dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              Déconnexion
            </button>
          </div>
        </div>

        <div className="mx-auto max-w-4xl px-4 pb-4 sm:px-6 border-t border-slate-200 pt-3 dark:border-slate-800/80">
          <OrganizationSwitcher variant="gate" />
        </div>
      </header>

      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 space-y-6">
          <OrganizationSubscriptionSection mode="pitchCheckout" />
        </div>
      </main>
    </div>
  );
}
