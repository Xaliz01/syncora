"use client";

import React from "react";
import { useAuth } from "@/components/auth/AuthContext";
import { getPermissionLabel } from "@/lib/permissions-catalog";

export function HomePage() {
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-blue-100 bg-white p-5 shadow-sm">
        <h1 className="text-2xl font-semibold mb-1">Tableau de bord</h1>
        <p className="text-slate-500 text-sm">
          Vous êtes connecté à votre organisation. Utilisez le menu de gauche pour gérer les
          utilisateurs, profils et permissions.
        </p>
      </section>

      <section className="rounded-xl border border-blue-100 bg-white p-4 shadow-sm">
        <h2 className="text-lg font-semibold mb-2">
          {user?.role === "admin" ? "Administration" : "Vos permissions"}
        </h2>
        {user?.permissions?.length ? (
          <div className="flex flex-wrap gap-1">
            {user.permissions.map((permission) => (
              <span
                key={permission}
                title={permission}
                className="rounded bg-blue-50 border border-blue-100 px-2 py-0.5 text-xs text-blue-700"
              >
                {getPermissionLabel(permission)}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-500">Aucune permission explicite.</p>
        )}
      </section>
    </div>
  );
}
