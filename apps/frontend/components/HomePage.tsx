"use client";

import React from "react";
import { useAuth } from "@/components/auth/AuthContext";

export function HomePage() {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white font-semibold">
              S
            </span>
            <div>
              <div className="font-semibold text-lg">Syncora</div>
              <div className="text-xs text-slate-400">CRM des opérations terrain</div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-slate-400">
              {user?.name ?? user?.email}
              {user?.role === "admin" && (
                <span className="ml-2 rounded bg-slate-700 px-2 py-0.5 text-xs text-slate-300">
                  Admin
                </span>
              )}
            </span>
            <button
              type="button"
              onClick={logout}
              className="text-sm text-slate-400 hover:text-slate-200"
            >
              Déconnexion
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <div className="max-w-6xl mx-auto px-4 py-10">
          <h1 className="text-3xl font-semibold mb-2">Bienvenue sur Syncora</h1>
          <p className="text-slate-400 mb-8 max-w-xl">
            Gérez votre portefeuille client, planifiez vos interventions, suivez vos stocks et
            votre flotte au même endroit.
          </p>

          <div className="grid gap-4 md:grid-cols-3">
            <section className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
              <h2 className="font-medium mb-1">Portefeuille client</h2>
              <p className="text-sm text-slate-400">
                Centralisez vos clients, sites et contacts, avec l’historique des interventions.
              </p>
            </section>

            <section className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
              <h2 className="font-medium mb-1">Interventions</h2>
              <p className="text-sm text-slate-400">
                Planifiez, assignez des intervenants et suivez le cycle de vie complet d’une
                intervention.
              </p>
            </section>

            <section className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
              <h2 className="font-medium mb-1">Stocks & flotte</h2>
              <p className="text-sm text-slate-400">
                Pilotez vos stocks, entrepôts et camions avec une vision temps réel.
              </p>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
