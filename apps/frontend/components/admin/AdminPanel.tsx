"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import type {
  InvitationResponse,
  PermissionCode,
  PermissionProfileResponse
} from "@syncora/shared";
import * as adminApi from "@/lib/admin.api";
import type { ManagedOrganizationUser } from "@/lib/admin.api";

interface AssignmentDraft {
  profileId: string;
  extraPermissions: PermissionCode[];
  revokedPermissions: PermissionCode[];
}

function togglePermissionInList(
  list: PermissionCode[],
  permission: PermissionCode
): PermissionCode[] {
  if (list.includes(permission)) {
    return list.filter((item) => item !== permission);
  }
  return [...list, permission];
}

function buildUserDrafts(users: ManagedOrganizationUser[]): Record<string, AssignmentDraft> {
  const drafts: Record<string, AssignmentDraft> = {};
  for (const user of users) {
    drafts[user.id] = {
      profileId: user.permissionAssignment.profileId ?? "",
      extraPermissions: user.permissionAssignment.extraPermissions,
      revokedPermissions: user.permissionAssignment.revokedPermissions
    };
  }
  return drafts;
}

export function AdminPanel() {
  const [catalog, setCatalog] = useState<PermissionCode[]>([]);
  const [profiles, setProfiles] = useState<PermissionProfileResponse[]>([]);
  const [users, setUsers] = useState<ManagedOrganizationUser[]>([]);
  const [invitations, setInvitations] = useState<InvitationResponse[]>([]);
  const [invitationStatusFilter, setInvitationStatusFilter] = useState<
    "pending" | "accepted" | "cancelled" | "all"
  >("pending");
  const [drafts, setDrafts] = useState<Record<string, AssignmentDraft>>({});
  const [loading, setLoading] = useState(true);
  const [savingByUserId, setSavingByUserId] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [profileName, setProfileName] = useState("");
  const [profileDescription, setProfileDescription] = useState("");
  const [profilePermissions, setProfilePermissions] = useState<PermissionCode[]>([]);
  const [creatingProfile, setCreatingProfile] = useState(false);

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviteRole, setInviteRole] = useState<"admin" | "member">("member");
  const [inviteProfileId, setInviteProfileId] = useState("");
  const [inviteExtraPermissions, setInviteExtraPermissions] = useState<PermissionCode[]>([]);
  const [inviteRevokedPermissions, setInviteRevokedPermissions] = useState<PermissionCode[]>([]);
  const [inviting, setInviting] = useState(false);

  const refreshData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [catalogRes, profilesRes, usersRes, invitationsRes] = await Promise.all([
        adminApi.getPermissionsCatalog(),
        adminApi.listPermissionProfiles(),
        adminApi.listOrganizationUsers(),
        adminApi.listInvitations(
          invitationStatusFilter === "all" ? undefined : invitationStatusFilter
        )
      ]);
      setCatalog(catalogRes.availablePermissions);
      setProfiles(profilesRes);
      setUsers(usersRes.users);
      setDrafts(buildUserDrafts(usersRes.users));
      setInvitations(invitationsRes);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur de chargement du panneau admin");
    } finally {
      setLoading(false);
    }
  }, [invitationStatusFilter]);

  useEffect(() => {
    void refreshData();
  }, [refreshData]);

  const profileOptions = useMemo(
    () =>
      profiles.map((profile) => ({
        id: profile.id,
        name: profile.name
      })),
    [profiles]
  );

  const handleCreateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setCreatingProfile(true);
    try {
      await adminApi.createPermissionProfile({
        name: profileName,
        description: profileDescription.trim() || undefined,
        permissions: profilePermissions
      });
      setProfileName("");
      setProfileDescription("");
      setProfilePermissions([]);
      setNotice("Profil créé avec succès.");
      await refreshData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible de créer le profil");
    } finally {
      setCreatingProfile(false);
    }
  };

  const handleDeleteProfile = async (profileId: string) => {
    setError(null);
    setNotice(null);
    try {
      await adminApi.deletePermissionProfile(profileId);
      setNotice("Profil supprimé.");
      await refreshData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible de supprimer le profil");
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setInviting(true);
    try {
      const result = await adminApi.inviteOrganizationUser({
        email: inviteEmail,
        name: inviteName.trim() || undefined,
        role: inviteRole,
        profileId: inviteProfileId || undefined,
        extraPermissions: inviteExtraPermissions,
        revokedPermissions: inviteRevokedPermissions
      });
      setInviteEmail("");
      setInviteName("");
      setInviteRole("member");
      setInviteProfileId("");
      setInviteExtraPermissions([]);
      setInviteRevokedPermissions([]);
      setNotice(`Invitation envoyée. Token: ${result.invitation.invitationToken}`);
      await refreshData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible d’inviter cet utilisateur");
    } finally {
      setInviting(false);
    }
  };

  const updateDraft = (
    userId: string,
    patch: Partial<{
      profileId: string;
      extraPermissions: PermissionCode[];
      revokedPermissions: PermissionCode[];
    }>
  ) => {
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

  const saveUserPermissions = async (userId: string) => {
    const draft = drafts[userId];
    if (!draft) return;

    setError(null);
    setNotice(null);
    setSavingByUserId((previous) => ({ ...previous, [userId]: true }));
    try {
      await adminApi.updateOrganizationUserPermissions(userId, {
        profileId: draft.profileId || null,
        extraPermissions: draft.extraPermissions,
        revokedPermissions: draft.revokedPermissions
      });
      setNotice("Permissions utilisateur mises à jour.");
      await refreshData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible de mettre à jour cet utilisateur");
    } finally {
      setSavingByUserId((previous) => ({ ...previous, [userId]: false }));
    }
  };

  if (loading) {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 text-slate-400">
        Chargement de l’administration…
      </div>
    );
  }

  return (
    <div className="space-y-6">
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

      <section className="rounded-xl border border-slate-800 bg-slate-900/40 p-5">
        <h2 className="text-lg font-semibold mb-1">Créer un profil de permissions</h2>
        <p className="text-sm text-slate-400 mb-4">
          Définissez un profil réutilisable (ex: manager, planificateur, etc.).
        </p>
        <form onSubmit={handleCreateProfile} className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label htmlFor="profileName" className="block text-sm font-medium text-slate-300 mb-1">
                Nom du profil
              </label>
              <input
                id="profileName"
                type="text"
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
                required
                className="w-full rounded-lg border border-slate-700 bg-slate-800/60 px-3 py-2 text-slate-100 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>
            <div>
              <label
                htmlFor="profileDescription"
                className="block text-sm font-medium text-slate-300 mb-1"
              >
                Description (optionnel)
              </label>
              <input
                id="profileDescription"
                type="text"
                value={profileDescription}
                onChange={(e) => setProfileDescription(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-800/60 px-3 py-2 text-slate-100 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>
          </div>
          <div>
            <p className="text-sm font-medium text-slate-300 mb-2">Permissions du profil</p>
            <div className="grid gap-2 md:grid-cols-2">
              {catalog.map((permission) => (
                <label key={permission} className="flex items-center gap-2 text-sm text-slate-300">
                  <input
                    type="checkbox"
                    checked={profilePermissions.includes(permission)}
                    onChange={() =>
                      setProfilePermissions((previous) =>
                        togglePermissionInList(previous, permission)
                      )
                    }
                  />
                  <span className="font-mono">{permission}</span>
                </label>
              ))}
            </div>
          </div>
          <button
            type="submit"
            disabled={creatingProfile}
            className="rounded-lg bg-brand-600 px-4 py-2 font-medium text-white hover:bg-brand-500 disabled:opacity-50"
          >
            {creatingProfile ? "Création…" : "Créer le profil"}
          </button>
        </form>
      </section>

      <section className="rounded-xl border border-slate-800 bg-slate-900/40 p-5">
        <h2 className="text-lg font-semibold mb-3">Profils existants</h2>
        {profileOptions.length === 0 ? (
          <p className="text-sm text-slate-400">Aucun profil pour le moment.</p>
        ) : (
          <div className="space-y-3">
            {profiles.map((profile) => {
              return (
                <div
                  key={profile.id}
                  className="rounded-lg border border-slate-700 bg-slate-900/40 p-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">{profile.name}</p>
                      {profile.description && (
                        <p className="text-sm text-slate-400">{profile.description}</p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => void handleDeleteProfile(profile.id)}
                      className="text-sm text-red-300 hover:text-red-200"
                    >
                      Supprimer
                    </button>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {profile.permissions.map((permission) => (
                      <span
                        key={permission}
                        className="rounded bg-slate-800 px-2 py-0.5 text-xs text-slate-300 font-mono"
                      >
                        {permission}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="rounded-xl border border-slate-800 bg-slate-900/40 p-5">
        <h2 className="text-lg font-semibold mb-1">Inviter un utilisateur</h2>
        <p className="text-sm text-slate-400 mb-4">
          Crée un compte invité dans l’organisation et prépare ses permissions.
        </p>
        <form onSubmit={handleInvite} className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label htmlFor="inviteEmail" className="block text-sm font-medium text-slate-300 mb-1">
                Email
              </label>
              <input
                id="inviteEmail"
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                required
                className="w-full rounded-lg border border-slate-700 bg-slate-800/60 px-3 py-2 text-slate-100 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>
            <div>
              <label htmlFor="inviteName" className="block text-sm font-medium text-slate-300 mb-1">
                Nom (optionnel)
              </label>
              <input
                id="inviteName"
                type="text"
                value={inviteName}
                onChange={(e) => setInviteName(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-800/60 px-3 py-2 text-slate-100 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label htmlFor="inviteRole" className="block text-sm font-medium text-slate-300 mb-1">
                Rôle
              </label>
              <select
                id="inviteRole"
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as "admin" | "member")}
                className="w-full rounded-lg border border-slate-700 bg-slate-800/60 px-3 py-2 text-slate-100 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              >
                <option value="member">member</option>
                <option value="admin">admin</option>
              </select>
            </div>
            <div>
              <label
                htmlFor="inviteProfile"
                className="block text-sm font-medium text-slate-300 mb-1"
              >
                Profil (optionnel)
              </label>
              <select
                id="inviteProfile"
                value={inviteProfileId}
                onChange={(e) => setInviteProfileId(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-800/60 px-3 py-2 text-slate-100 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              >
                <option value="">Aucun profil</option>
                {profileOptions.map((profile) => (
                  <option key={profile.id} value={profile.id}>
                    {profile.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-sm font-medium text-slate-300 mb-2">Permissions à ajouter</p>
              <div className="grid gap-1">
                {catalog.map((permission) => (
                  <label key={`invite-add-${permission}`} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={inviteExtraPermissions.includes(permission)}
                      onChange={() =>
                        setInviteExtraPermissions((previous) =>
                          togglePermissionInList(previous, permission)
                        )
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
                  <label key={`invite-remove-${permission}`} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={inviteRevokedPermissions.includes(permission)}
                      onChange={() =>
                        setInviteRevokedPermissions((previous) =>
                          togglePermissionInList(previous, permission)
                        )
                      }
                    />
                    <span className="font-mono text-slate-300">{permission}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
          <button
            type="submit"
            disabled={inviting}
            className="rounded-lg bg-brand-600 px-4 py-2 font-medium text-white hover:bg-brand-500 disabled:opacity-50"
          >
            {inviting ? "Invitation…" : "Inviter l’utilisateur"}
          </button>
        </form>
      </section>

      <section className="rounded-xl border border-slate-800 bg-slate-900/40 p-5">
        <div className="flex items-center justify-between gap-3 mb-3">
          <h2 className="text-lg font-semibold">Utilisateurs de l’organisation</h2>
          <button
            type="button"
            onClick={() => void refreshData()}
            className="rounded-lg border border-slate-700 px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-800"
          >
            Rafraîchir
          </button>
        </div>
        <div className="space-y-4">
          {users.map((user) => {
            const draft = drafts[user.id] ?? {
              profileId: "",
              extraPermissions: [],
              revokedPermissions: []
            };
            return (
              <article
                key={user.id}
                className="rounded-lg border border-slate-700 bg-slate-900/40 p-4 space-y-3"
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
                          key={`${user.id}-effective-${permission}`}
                          className="rounded bg-slate-800 px-2 py-0.5 text-xs text-slate-300 font-mono"
                        >
                          {permission}
                        </span>
                      ))
                    )}
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <label
                      htmlFor={`profile-${user.id}`}
                      className="block text-sm font-medium text-slate-300 mb-1"
                    >
                      Profil associé
                    </label>
                    <select
                      id={`profile-${user.id}`}
                      value={draft.profileId}
                      onChange={(e) => updateDraft(user.id, { profileId: e.target.value })}
                      className="w-full rounded-lg border border-slate-700 bg-slate-800/60 px-3 py-2 text-slate-100 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                    >
                      <option value="">Aucun profil</option>
                      {profileOptions.map((profile) => (
                        <option key={`${user.id}-${profile.id}`} value={profile.id}>
                          {profile.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-end">
                    <button
                      type="button"
                      onClick={() => void saveUserPermissions(user.id)}
                      disabled={savingByUserId[user.id]}
                      className="rounded-lg bg-brand-600 px-4 py-2 font-medium text-white hover:bg-brand-500 disabled:opacity-50"
                    >
                      {savingByUserId[user.id] ? "Enregistrement…" : "Enregistrer"}
                    </button>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <p className="text-sm font-medium text-slate-300 mb-2">Permissions à ajouter</p>
                    <div className="grid gap-1">
                      {catalog.map((permission) => (
                        <label
                          key={`${user.id}-extra-${permission}`}
                          className="flex items-center gap-2 text-sm"
                        >
                          <input
                            type="checkbox"
                            checked={draft.extraPermissions.includes(permission)}
                            onChange={() =>
                              updateDraft(user.id, {
                                extraPermissions: togglePermissionInList(
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
                        <label
                          key={`${user.id}-revoked-${permission}`}
                          className="flex items-center gap-2 text-sm"
                        >
                          <input
                            type="checkbox"
                            checked={draft.revokedPermissions.includes(permission)}
                            onChange={() =>
                              updateDraft(user.id, {
                                revokedPermissions: togglePermissionInList(
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
      </section>

      <section className="rounded-xl border border-slate-800 bg-slate-900/40 p-5">
        <div className="flex items-center justify-between gap-3 mb-3">
          <h2 className="text-lg font-semibold">Invitations</h2>
          <select
            value={invitationStatusFilter}
            onChange={(e) =>
              setInvitationStatusFilter(
                e.target.value as "pending" | "accepted" | "cancelled" | "all"
              )
            }
            className="rounded-lg border border-slate-700 bg-slate-800/60 px-3 py-1.5 text-sm text-slate-100"
          >
            <option value="pending">pending</option>
            <option value="accepted">accepted</option>
            <option value="cancelled">cancelled</option>
            <option value="all">all</option>
          </select>
        </div>
        <div className="space-y-2">
          {invitations.length === 0 ? (
            <p className="text-sm text-slate-400">Aucune invitation.</p>
          ) : (
            invitations.map((invitation) => (
              <div
                key={invitation.id}
                className="rounded-lg border border-slate-700 bg-slate-900/40 p-3 text-sm"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{invitation.invitedEmail}</span>
                  <span className="rounded bg-slate-800 px-2 py-0.5 text-xs text-slate-300">
                    {invitation.status}
                  </span>
                </div>
                <p className="text-slate-400 mt-1">
                  Token: <span className="font-mono text-slate-300">{invitation.invitationToken}</span>
                </p>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
