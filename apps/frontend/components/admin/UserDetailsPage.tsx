"use client";

import Link from "next/link";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import type { PermissionCode, PermissionProfileResponse } from "@syncora/shared";
import * as adminApi from "@/lib/admin.api";
import { getPermissionLabel } from "@/lib/permissions-catalog";
import type { ManagedOrganizationUser } from "@/lib/admin.api";
import { useToast } from "@/components/ui/ToastProvider";

const ROLE_LABELS: Record<string, string> = {
  admin: "Administrateur",
  member: "Membre"
};

const USER_STATUS_LABELS: Record<string, string> = {
  active: "Actif",
  pending: "En attente",
  inactive: "Inactif",
  suspended: "Suspendu"
};

function togglePermission(list: PermissionCode[], permission: PermissionCode): PermissionCode[] {
  if (list.includes(permission)) return list.filter((item) => item !== permission);
  return [...list, permission];
}

export function UserDetailsPage({ userId }: { userId: string }) {
  const { showToast } = useToast();
  const [catalog, setCatalog] = useState<PermissionCode[]>([]);
  const [profiles, setProfiles] = useState<PermissionProfileResponse[]>([]);
  const [user, setUser] = useState<ManagedOrganizationUser | null>(null);
  const [profileId, setProfileId] = useState("");
  const [selectedPermissions, setSelectedPermissions] = useState<PermissionCode[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      setSelectedPermissions(currentUser.permissions);
      setIsEditing(false);
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
    const profilePermissions =
      profiles.find((profile) => profile.id === profileId)?.permissions ?? [];
    try {
      await adminApi.updateOrganizationUserPermissions(user.id, {
        profileId: profileId || null,
        extraPermissions: selectedPermissions.filter(
          (permission) => !profilePermissions.includes(permission)
        ),
        revokedPermissions: profilePermissions.filter(
          (permission) => !selectedPermissions.includes(permission)
        )
      });
      showToast("Droits utilisateur mis à jour.");
      setIsEditing(false);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible de sauvegarder les droits");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-500">
        Chargement de la fiche utilisateur...
      </div>
    );
  }

  if (!user) {
    return (
      <div className="space-y-3">
        <p className="text-slate-700">Utilisateur introuvable.</p>
        <Link href="/users" className="text-brand-600 hover:underline">
          Retour à la liste
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold mb-1">Fiche utilisateur</h1>
          <p className="text-sm text-slate-500 mt-1">
            Détail de <span className="font-medium text-slate-700">{user.email}</span>.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {!isOrganizationAdmin && (
            <button
              type="button"
              onClick={() => setIsEditing((previous) => !previous)}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
            >
              {isEditing ? "Annuler" : "Modifier"}
            </button>
          )}
          <Link
            href="/users"
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
          >
            Retour à la liste
          </Link>
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm p-3">
          {error}
        </div>
      )}

      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="grid gap-2 md:grid-cols-2 text-sm">
          <div>
            <span className="text-slate-400">Nom</span>
            <p>{user.name ?? "—"}</p>
          </div>
          <div>
            <span className="text-slate-400">Email</span>
            <p>{user.email}</p>
          </div>
          <div>
            <span className="text-slate-400">Rôle</span>
            <p>{ROLE_LABELS[user.role] ?? user.role}</p>
          </div>
          <div>
            <span className="text-slate-400">Statut</span>
            <p>{USER_STATUS_LABELS[user.status] ?? user.status}</p>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="font-semibold mb-2">Permissions actuelles</h2>
        <div className="flex flex-wrap gap-2">
          {user.permissions.map((permission) => (
            <div
              key={permission}
              className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1 text-xs"
            >
              <div className="text-slate-800">{getPermissionLabel(permission)}</div>
              <div className="text-slate-500 font-mono">{permission}</div>
            </div>
          ))}
        </div>
      </section>

      {isOrganizationAdmin ? (
        <section className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
          Cet utilisateur est administrateur d’organisation : ses droits sont complets et ne peuvent
          pas être modifiés.
        </section>
      ) : (
        <section className="rounded-xl border border-slate-200 bg-white p-4 space-y-4">
          <h2 className="font-semibold">Affectation</h2>

          {!isEditing ? (
            <div className="space-y-3 text-sm">
              <div>
                <span className="text-slate-400">Profil</span>
                <p className="text-slate-700">{selectedProfileName}</p>
              </div>
              <div>
                <span className="text-slate-400">Permissions ciblées</span>
                <div className="mt-2 grid gap-2 md:grid-cols-2">
                  {selectedPermissions.map((permission) => (
                    <div key={permission} className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
                      <div className="text-slate-700">{getPermissionLabel(permission)}</div>
                      <div className="text-xs text-slate-400 font-mono">{permission}</div>
                    </div>
                  ))}
                  {selectedPermissions.length === 0 && (
                    <p className="text-slate-500">Aucune permission ciblée.</p>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <>
              <div>
                <label className="block text-sm text-slate-500 mb-1">Profil affecté</label>
                <select
                  value={profileId}
                  onChange={(e) => {
                    const nextProfileId = e.target.value;
                    setProfileId(nextProfileId);
                    const profilePermissions =
                      profiles.find((profile) => profile.id === nextProfileId)?.permissions ?? [];
                    setSelectedPermissions(profilePermissions);
                  }}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-900"
                >
                  <option value="">Aucun profil</option>
                  {profiles.map((profile) => (
                    <option key={profile.id} value={profile.id}>
                      {profile.name}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-slate-400">
                  Profil sélectionné : {selectedProfileName}
                </p>
              </div>

              <div>
                <p className="text-sm font-medium text-slate-700 mb-2">Permissions</p>
                <div className="grid gap-2 md:grid-cols-2">
                  {catalog.map((permission) => (
                    <label key={permission} className="flex items-start gap-2 text-sm">
                      <input
                        type="checkbox"
                        className="mt-1"
                        checked={selectedPermissions.includes(permission)}
                        onChange={() =>
                          setSelectedPermissions((previous) => togglePermission(previous, permission))
                        }
                      />
                      <span>
                        <span className="block text-slate-700">{getPermissionLabel(permission)}</span>
                        <span className="block text-xs text-slate-400 font-mono">{permission}</span>
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => void handleSave()}
                  disabled={saving}
                  className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-500 disabled:opacity-50"
                >
                  {saving ? "Enregistrement..." : "Enregistrer"}
                </button>
              </div>
            </>
          )}
        </section>
      )}
    </div>
  );
}
