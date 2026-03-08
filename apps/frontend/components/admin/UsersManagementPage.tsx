"use client";

import React, { useCallback, useEffect, useState } from "react";
import type { PermissionCode, PermissionProfileResponse } from "@syncora/shared";
import * as adminApi from "@/lib/admin.api";
import type { ManagedOrganizationUser } from "@/lib/admin.api";

interface AssignmentDraft {
  profileId: string;
  extraPermissions: PermissionCode[];
  revokedPermissions: PermissionCode[];
}

function togglePermission(list: PermissionCode[], permission: PermissionCode): PermissionCode[] {
  if (list.includes(permission)) return list.filter((item) => item !== permission);
  return [...list, permission];
}

function toDrafts(users: ManagedOrganizationUser[]): Record<string, AssignmentDraft> {
  const output: Record<string, AssignmentDraft> = {};
  for (const user of users) {
    output[user.id] = {
      profileId: user.permissionAssignment.profileId ?? "",
      extraPermissions: user.permissionAssignment.extraPermissions,
      revokedPermissions: user.permissionAssignment.revokedPermissions
    };
  }
  return output;
}

export function UsersManagementPage() {
  const [catalog, setCatalog] = useState<PermissionCode[]>([]);
  const [profiles, setProfiles] = useState<PermissionProfileResponse[]>([]);
  const [users, setUsers] = useState<ManagedOrganizationUser[]>([]);
  const [drafts, setDrafts] = useState<Record<string, AssignmentDraft>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [savingByUserId, setSavingByUserId] = useState<Record<string, boolean>>({});

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [catalogRes, profilesRes, usersRes] = await Promise.all([
        adminApi.getPermissionsCatalog(),
        adminApi.listPermissionProfiles(),
        adminApi.listOrganizationUsers()
      ]);
      setCatalog(catalogRes.availablePermissions);
      setProfiles(profilesRes);
      setUsers(usersRes.users);
      setDrafts(toDrafts(usersRes.users));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur de chargement des utilisateurs");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const updateDraft = (userId: string, patch: Partial<AssignmentDraft>) => {
    setDrafts((previous) => {
      const current = previous[userId] ?? {
        profileId: "",
        extraPermissions: [],
        revokedPermissions: []
      };
      return {
        ...previous,
        [userId]: {
          ...current,
          ...patch
        }
      };
    });
  };

  const saveUser = async (userId: string) => {
    const draft = drafts[userId];
    if (!draft) return;

    setSavingByUserId((previous) => ({ ...previous, [userId]: true }));
    setError(null);
    setNotice(null);
    try {
      await adminApi.updateOrganizationUserPermissions(userId, {
        profileId: draft.profileId || null,
        extraPermissions: draft.extraPermissions,
        revokedPermissions: draft.revokedPermissions
      });
      setNotice("Droits utilisateur mis à jour.");
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible de mettre à jour cet utilisateur");
    } finally {
      setSavingByUserId((previous) => ({ ...previous, [userId]: false }));
    }
  };

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
      {notice && (
        <div className="rounded-lg bg-emerald-900/30 border border-emerald-800 text-emerald-200 text-sm p-3">
          {notice}
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
        <div className="space-y-4">
          {users.map((user) => {
            const draft = drafts[user.id] ?? {
              profileId: "",
              extraPermissions: [],
              revokedPermissions: [],
            };
            return (
              <article
                key={user.id}
                className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 space-y-3"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium">{user.name ?? user.email}</p>
                  <span className="rounded bg-slate-800 px-2 py-0.5 text-xs text-slate-300">
                    {user.role}
                  </span>
                  <span className="rounded bg-slate-800 px-2 py-0.5 text-xs text-slate-300">
                    {user.status}
                  </span>
                </div>
                <p className="text-sm text-slate-400">{user.email}</p>

                <div>
                  <p className="text-sm font-medium text-slate-300 mb-1">Permissions effectives</p>
                  <div className="flex flex-wrap gap-1">
                    {user.permissions.length === 0 ? (
                      <span className="text-sm text-slate-500">Aucune permission</span>
                    ) : (
                      user.permissions.map((permission) => (
                        <span
                          key={`${user.id}-${permission}`}
                          className="rounded bg-slate-800 px-2 py-0.5 text-xs text-slate-300 font-mono"
                        >
                          {permission}
                        </span>
                      ))
                    )}
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-[1fr_auto]">
                  <select
                    value={draft.profileId}
                    onChange={(e) => updateDraft(user.id, { profileId: e.target.value })}
                    className="rounded-lg border border-slate-700 bg-slate-800/60 px-3 py-2 text-slate-100"
                  >
                    <option value="">Aucun profil</option>
                    {profiles.map((profile) => (
                      <option key={`${user.id}-${profile.id}`} value={profile.id}>
                        {profile.name}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => void saveUser(user.id)}
                    disabled={savingByUserId[user.id]}
                    className="rounded-lg bg-brand-600 px-4 py-2 text-white hover:bg-brand-500 disabled:opacity-50"
                  >
                    {savingByUserId[user.id] ? "Enregistrement..." : "Enregistrer"}
                  </button>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <p className="text-sm font-medium text-slate-300 mb-2">Permissions à ajouter</p>
                    <div className="grid gap-1">
                      {catalog.map((permission) => (
                        <label key={`${user.id}-add-${permission}`} className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={draft.extraPermissions.includes(permission)}
                            onChange={() =>
                              updateDraft(user.id, {
                                extraPermissions: togglePermission(
                                  draft.extraPermissions,
                                  permission
                                )
                              })
                            }
                          />
                          <span className="font-mono text-slate-300">{permission}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-300 mb-2">Permissions à retirer</p>
                    <div className="grid gap-1">
                      {catalog.map((permission) => (
                        <label key={`${user.id}-remove-${permission}`} className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={draft.revokedPermissions.includes(permission)}
                            onChange={() =>
                              updateDraft(user.id, {
                                revokedPermissions: togglePermission(
                                  draft.revokedPermissions,
                                  permission
                                )
                              })
                            }
                          />
                          <span className="font-mono text-slate-300">{permission}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
