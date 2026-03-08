"use client";

import React from "react";
import { useAuth } from "@/components/auth/AuthContext";

export function HomePage() {
  const { user } = useAuth();

  return (
    <div>
      <h1 className="text-3xl font-semibold mb-2">Bienvenue sur Syncora</h1>
      <p className="text-slate-400 mb-8 max-w-xl">
        Gérez votre portefeuille client, planifiez vos interventions, suivez vos stocks et votre
        flotte au même endroit.
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

      <section className="mt-8 rounded-xl border border-slate-800 bg-slate-900/40 p-4">
        <h2 className="text-lg font-semibold mb-2">
          {user?.role === "admin" ? "Administration" : "Vos permissions"}
        </h2>
        {user?.permissions?.length ? (
          <div className="flex flex-wrap gap-1">
            {user.permissions.map((permission) => (
              <span
                key={permission}
                className="rounded bg-slate-800 px-2 py-0.5 text-xs text-slate-300 font-mono"
              >
                {permission}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-400">Aucune permission explicite.</p>
        )}
      </section>
    </div>
  );
}
