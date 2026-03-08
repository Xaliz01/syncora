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
          <p className="text-sm text-slate-500">
            Liste des utilisateurs de l’organisation. Ouvrez une fiche pour gérer les droits.
          </p>
        </div>
        <Link
          href="/users/new"
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm text-white hover:bg-brand-500"
        >
          Inviter un utilisateur
        </Link>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm p-3">
          {error}
        </div>
      )}

      {loading ? (
        <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-500">
          Chargement...
        </div>
      ) : users.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-500">
          Aucun utilisateur.
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          <div className="hidden md:grid md:grid-cols-[1.2fr_1.2fr_auto_auto_auto] gap-3 border-b border-slate-200 px-4 py-3 text-xs uppercase tracking-wide text-slate-400">
            <span>Utilisateur</span>
            <span>Email</span>
            <span>Rôle</span>
            <span>Statut</span>
            <span>Détail</span>
          </div>
          {users.map((user) => (
            <div
              key={user.id}
              className="grid md:grid-cols-[1.2fr_1.2fr_auto_auto_auto] gap-3 items-center px-4 py-3 border-b border-slate-200 last:border-b-0"
            >
              <div className="font-medium">{user.name ?? "Sans nom"}</div>
              <div className="text-sm text-slate-500">{user.email}</div>
              <span className="inline-flex w-fit rounded bg-slate-100 border border-slate-200 px-2 py-0.5 text-xs text-slate-700">
                {user.role}
              </span>
              <span className="inline-flex w-fit rounded bg-slate-100 border border-slate-200 px-2 py-0.5 text-xs text-slate-700">
                {user.status}
              </span>
              <Link
                href={`/users/${user.id}`}
                className="text-sm text-brand-600 hover:text-brand-700 hover:underline"
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
