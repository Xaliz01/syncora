"use client";

import Link from "next/link";
import React, { useCallback, useEffect, useState } from "react";
import type { InvitationResponse } from "@syncora/shared";
import * as adminApi from "@/lib/admin.api";
import type { ManagedOrganizationUser } from "@/lib/admin.api";

export function UsersManagementPage() {
  const [users, setUsers] = useState<ManagedOrganizationUser[]>([]);
  const [invitations, setInvitations] = useState<InvitationResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [usersRes, invitationsRes] = await Promise.all([
        adminApi.listOrganizationUsers(),
        adminApi.listInvitations()
      ]);
      setUsers(usersRes.users);
      setInvitations(invitationsRes);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur de chargement des utilisateurs");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold mb-1">Utilisateurs</h1>
          <p className="text-sm text-slate-500">
            Liste des utilisateurs de l’organisation. Cliquez sur un nom pour ouvrir sa fiche.
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
          <div className="hidden md:grid md:grid-cols-[1.2fr_1.2fr_auto_auto] gap-3 border-b border-slate-200 px-4 py-3 text-xs uppercase tracking-wide text-slate-400">
            <span>Utilisateur</span>
            <span>Email</span>
            <span>Rôle</span>
            <span>Statut</span>
          </div>
          {users.map((user) => (
            <div
              key={user.id}
              className="grid md:grid-cols-[1.2fr_1.2fr_auto_auto] gap-3 items-center px-4 py-3 border-b border-slate-200 last:border-b-0"
            >
              <Link
                href={`/users/${user.id}`}
                className="font-medium text-brand-700 hover:text-brand-800 hover:underline"
              >
                {user.name ?? user.email}
              </Link>
              <div className="text-sm text-slate-500">{user.email}</div>
              <span className="inline-flex w-fit rounded bg-slate-100 border border-slate-200 px-2 py-0.5 text-xs text-slate-700">
                {user.role}
              </span>
              <span className="inline-flex w-fit rounded bg-slate-100 border border-slate-200 px-2 py-0.5 text-xs text-slate-700">
                {user.status}
              </span>
            </div>
          ))}
        </div>
      )}

      {!loading && (
        <section className="rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="font-semibold mb-3">Suivi des invitations</h2>
          {invitations.length === 0 ? (
            <p className="text-sm text-slate-500">Aucune invitation.</p>
          ) : (
            <div className="space-y-2">
              {invitations.map((invitation) => (
                <article
                  key={invitation.id}
                  className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{invitation.invitedEmail}</span>
                    <span className="rounded border border-slate-200 bg-white px-2 py-0.5 text-xs text-slate-600">
                      {invitation.status}
                    </span>
                  </div>
                  <p className="mt-1 text-slate-500">
                    Token:{" "}
                    <span className="font-mono text-slate-700 break-all">{invitation.invitationToken}</span>
                  </p>
                </article>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
