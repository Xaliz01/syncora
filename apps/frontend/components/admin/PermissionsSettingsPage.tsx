"use client";

import React, { useCallback, useEffect, useState } from "react";
import type { InvitationResponse, PermissionCode } from "@syncora/shared";
import * as adminApi from "@/lib/admin.api";
import { getPermissionLabel } from "@/lib/permissions-catalog";

type InvitationStatusFilter = "pending" | "accepted" | "cancelled" | "all";

export function PermissionsSettingsPage() {
  const [catalog, setCatalog] = useState<PermissionCode[]>([]);
  const [invitations, setInvitations] = useState<InvitationResponse[]>([]);
  const [statusFilter, setStatusFilter] = useState<InvitationStatusFilter>("pending");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [catalogRes, invitationsRes] = await Promise.all([
        adminApi.getPermissionsCatalog(),
        adminApi.listInvitations(statusFilter === "all" ? undefined : statusFilter)
      ]);
      setCatalog(catalogRes.availablePermissions);
      setInvitations(invitationsRes);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur de chargement des permissions");
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold mb-1">Paramètres → Permissions</h1>
          <p className="text-sm text-slate-500">
            Référence des permissions disponibles et suivi des invitations.
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm p-3">
          {error}
        </div>
      )}

      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="font-semibold mb-3">Catalogue des permissions</h2>
        {loading ? (
          <p className="text-sm text-slate-500">Chargement...</p>
        ) : (
          <div className="grid gap-2 md:grid-cols-2">
            {catalog.map((permission) => (
              <div
                key={permission}
                className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700"
              >
                <div className="text-slate-800">{getPermissionLabel(permission)}</div>
                <div className="text-xs text-slate-400 font-mono">{permission}</div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex items-center justify-between gap-3 mb-3">
          <h2 className="font-semibold">Invitations</h2>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as InvitationStatusFilter)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-900"
          >
            <option value="pending">pending</option>
            <option value="accepted">accepted</option>
            <option value="cancelled">cancelled</option>
            <option value="all">all</option>
          </select>
        </div>
        {loading ? (
          <p className="text-sm text-slate-500">Chargement...</p>
        ) : invitations.length === 0 ? (
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
                  Token: <span className="font-mono text-slate-700">{invitation.invitationToken}</span>
                </p>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
