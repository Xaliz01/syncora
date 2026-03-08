"use client";

import Link from "next/link";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import type { PermissionCode, PermissionProfileResponse } from "@syncora/shared";
import * as adminApi from "@/lib/admin.api";
import { getPermissionLabel } from "@/lib/permissions-catalog";
import type { ManagedOrganizationUser } from "@/lib/admin.api";

function togglePermission(list: PermissionCode[], permission: PermissionCode): PermissionCode[] {
  if (list.includes(permission)) return list.filter((item) => item !== permission);
  return [...list, permission];
}

export function UserDetailsPage({ userId }: { userId: string }) {
  const [catalog, setCatalog] = useState<PermissionCode[]>([]);
  const [profiles, setProfiles] = useState<PermissionProfileResponse[]>([]);
  const [user, setUser] = useState<ManagedOrganizationUser | null>(null);
  const [profileId, setProfileId] = useState("");
  const [extraPermissions, setExtraPermissions] = useState<PermissionCode[]>([]);
  const [revokedPermissions, setRevokedPermissions] = useState<PermissionCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const isOrganizationAdmin = user?.role === "admin";

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [catalogRes, profilesRes, userRes] = await Promise.all([
        adminApi.getPermissionsCatalog(),
        adminApi.listPermissionProfiles(),
        adminApi.getOrganizationUser(userId)
      ]);
      const currentUser = userRes.user;
      setCatalog(catalogRes.availablePermissions);
      setProfiles(profilesRes);
      setUser(currentUser);
      setProfileId(currentUser.permissionAssignment.profileId ?? "");
      setExtraPermissions(currentUser.permissionAssignment.extraPermissions);
      setRevokedPermissions(currentUser.permissionAssignment.revokedPermissions);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur de chargement de la fiche utilisateur");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const selectedProfileName = useMemo(() => {
    if (!profileId) return "Aucun profil";
    return profiles.find((profile) => profile.id === profileId)?.name ?? "Profil inconnu";
  }, [profileId, profiles]);

  const handleSave = async () => {
    if (!user || isOrganizationAdmin) return;
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      await adminApi.updateOrganizationUserPermissions(user.id, {
        profileId: profileId || null,
        extraPermissions,
        revokedPermissions
      });
      setNotice("Droits utilisateur mis à jour.");
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible de sauvegarder les droits");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 text-sm text-slate-400">
        Chargement de la fiche utilisateur...
      </div>
    );
  }

  if (!user) {
    return (
      <div className="space-y-3">
        <p className="text-slate-300">Utilisateur introuvable.</p>
        <Link href="/users" className="text-brand-400 hover:underline">
          Retour à la liste
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold mb-1">Fiche utilisateur</h1>
          <p className="text-sm text-slate-400">
            Gérez les droits de <span className="font-medium text-slate-300">{user.email}</span>.
          </p>
        </div>
        <Link
          href="/users"
          className="rounded-lg border border-slate-700 px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-800"
        >
          Retour à la liste
        </Link>
      </div>

      {error && (
        <div className="rounded-lg bg-red-900/30 border border-red-800 text-red-200 text-sm p-3">
          {error}
        </div>
      )}
      {notice && (
        <div className="rounded-lg bg-emerald-900/30 border border-emerald-800 text-emerald-200 text-sm p-3">
          {notice}
        </div>
      )}

      <section className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
        <div className="grid gap-2 md:grid-cols-2 text-sm">
          <div>
            <span className="text-slate-500">Nom</span>
            <p>{user.name ?? "—"}</p>
          </div>
          <div>
            <span className="text-slate-500">Email</span>
            <p>{user.email}</p>
          </div>
          <div>
            <span className="text-slate-500">Rôle</span>
            <p>{user.role}</p>
          </div>
          <div>
            <span className="text-slate-500">Statut</span>
            <p>{user.status}</p>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
        <h2 className="font-semibold mb-2">Permissions effectives</h2>
        <div className="flex flex-wrap gap-2">
          {user.permissions.map((permission) => (
            <div
              key={permission}
              className="rounded-lg border border-slate-700 bg-slate-900/50 px-3 py-1 text-xs"
            >
              <div className="text-slate-200">{getPermissionLabel(permission)}</div>
              <div className="text-slate-500 font-mono">{permission}</div>
            </div>
          ))}
        </div>
      </section>

      {isOrganizationAdmin ? (
        <section className="rounded-xl border border-amber-700/40 bg-amber-900/20 p-4 text-sm text-amber-100">
          Cet utilisateur est administrateur d’organisation : ses droits sont complets et ne peuvent
          pas être modifiés.
        </section>
      ) : (
        <section className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 space-y-4">
          <h2 className="font-semibold">Affectation et exceptions</h2>

          <div>
            <label className="block text-sm text-slate-400 mb-1">Profil affecté</label>
            <select
              value={profileId}
              onChange={(e) => setProfileId(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-800/60 px-3 py-2 text-slate-100"
            >
              <option value="">Aucun profil</option>
              {profiles.map((profile) => (
                <option key={profile.id} value={profile.id}>
                  {profile.name}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-slate-500">Profil sélectionné : {selectedProfileName}</p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-sm font-medium text-slate-300 mb-2">Permissions à ajouter</p>
              <div className="grid gap-2">
                {catalog.map((permission) => (
                  <label key={`add-${permission}`} className="flex items-start gap-2 text-sm">
                    <input
                      type="checkbox"
                      className="mt-1"
                      checked={extraPermissions.includes(permission)}
                      onChange={() =>
                        setExtraPermissions((previous) => togglePermission(previous, permission))
                      }
                    />
                    <span>
                      <span className="block text-slate-200">{getPermissionLabel(permission)}</span>
                      <span className="block text-xs text-slate-500 font-mono">{permission}</span>
                    </span>
                  </label>
                ))}
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-300 mb-2">Permissions à retirer</p>
              <div className="grid gap-2">
                {catalog.map((permission) => (
                  <label key={`remove-${permission}`} className="flex items-start gap-2 text-sm">
                    <input
                      type="checkbox"
                      className="mt-1"
                      checked={revokedPermissions.includes(permission)}
                      onChange={() =>
                        setRevokedPermissions((previous) => togglePermission(previous, permission))
                      }
                    />
                    <span>
                      <span className="block text-slate-200">{getPermissionLabel(permission)}</span>
                      <span className="block text-xs text-slate-500 font-mono">{permission}</span>
                    </span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={saving}
              className="rounded-lg bg-brand-600 px-4 py-2 text-white hover:bg-brand-500 disabled:opacity-50"
            >
              {saving ? "Enregistrement..." : "Enregistrer"}
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
