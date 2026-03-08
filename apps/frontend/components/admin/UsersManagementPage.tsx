"use client";

import Link from "next/link";
import React, { useCallback, useEffect, useState } from "react";
import * as adminApi from "@/lib/admin.api";
import type { ManagedOrganizationUser } from "@/lib/admin.api";

export function UsersManagementPage() {
  const [users, setUsers] = useState<ManagedOrganizationUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const usersRes = await adminApi.listOrganizationUsers();
      setUsers(usersRes.users);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur de chargement des utilisateurs");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold mb-1">Utilisateurs → Gérer les utilisateurs</h1>
          <p className="text-sm text-slate-400">
            Affectez des profils et ajustez les permissions dans le détail.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void refresh()}
          className="rounded-lg border border-slate-700 px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-800"
        >
          Rafraîchir
        </button>
      </div>

      {error && (
        <div className="rounded-lg bg-red-900/30 border border-red-800 text-red-200 text-sm p-3">
          {error}
        </div>
      )}

      {loading ? (
        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 text-sm text-slate-400">
          Chargement...
        </div>
      ) : users.length === 0 ? (
        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 text-sm text-slate-400">
          Aucun utilisateur.
        </div>
      ) : (
        <div className="rounded-xl border border-slate-800 bg-slate-900/40 overflow-hidden">
          <div className="hidden md:grid md:grid-cols-[1.2fr_1.2fr_auto_auto_auto] gap-3 border-b border-slate-800 px-4 py-3 text-xs uppercase tracking-wide text-slate-500">
            <span>Utilisateur</span>
            <span>Email</span>
            <span>Rôle</span>
            <span>Statut</span>
            <span>Détail</span>
          </div>
          {users.map((user) => (
            <div
              key={user.id}
              className="grid md:grid-cols-[1.2fr_1.2fr_auto_auto_auto] gap-3 items-center px-4 py-3 border-b border-slate-800/70 last:border-b-0"
            >
              <div className="font-medium">{user.name ?? "Sans nom"}</div>
              <div className="text-sm text-slate-400">{user.email}</div>
              <span className="inline-flex w-fit rounded bg-slate-800 px-2 py-0.5 text-xs text-slate-300">
                {user.role}
              </span>
              <span className="inline-flex w-fit rounded bg-slate-800 px-2 py-0.5 text-xs text-slate-300">
                {user.status}
              </span>
              <Link
                href={`/users/${user.id}`}
                className="text-sm text-brand-400 hover:text-brand-300 hover:underline"
              >
                Ouvrir la fiche
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
