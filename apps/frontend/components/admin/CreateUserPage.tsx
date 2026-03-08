"use client";

import React, { useCallback, useEffect, useState } from "react";
import type { InvitationResponse, PermissionCode, PermissionProfileResponse } from "@syncora/shared";
import * as adminApi from "@/lib/admin.api";
import { getPermissionLabel } from "@/lib/permissions-catalog";

function togglePermission(list: PermissionCode[], permission: PermissionCode): PermissionCode[] {
  if (list.includes(permission)) return list.filter((item) => item !== permission);
  return [...list, permission];
}

export function CreateUserPage() {
  const [catalog, setCatalog] = useState<PermissionCode[]>([]);
  const [profiles, setProfiles] = useState<PermissionProfileResponse[]>([]);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<"admin" | "member">("member");
  const [profileId, setProfileId] = useState("");
  const [extraPermissions, setExtraPermissions] = useState<PermissionCode[]>([]);
  const [revokedPermissions, setRevokedPermissions] = useState<PermissionCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [invitation, setInvitation] = useState<InvitationResponse | null>(null);
  const adminRoleSelected = role === "admin";

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [catalogRes, profilesRes] = await Promise.all([
        adminApi.getPermissionsCatalog(),
        adminApi.listPermissionProfiles()
      ]);
      setCatalog(catalogRes.availablePermissions);
      setProfiles(profilesRes);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur de chargement");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const result = await adminApi.inviteOrganizationUser({
        email,
        name: name.trim() || undefined,
        role,
        profileId: adminRoleSelected ? undefined : profileId || undefined,
        extraPermissions: adminRoleSelected ? [] : extraPermissions,
        revokedPermissions: adminRoleSelected ? [] : revokedPermissions
      });
      setInvitation(result.invitation);
      setEmail("");
      setName("");
      setRole("member");
      setProfileId("");
      setExtraPermissions([]);
      setRevokedPermissions([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible d’inviter l’utilisateur");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold mb-1">Utilisateurs → Inviter / créer</h1>
        <p className="text-sm text-slate-400">
          Invitez un utilisateur dans votre organisation et pré-configurez ses droits.
        </p>
      </div>

      {error && (
        <div className="rounded-lg bg-red-900/30 border border-red-800 text-red-200 text-sm p-3">
          {error}
        </div>
      )}

      {invitation && (
        <div className="rounded-lg bg-emerald-900/30 border border-emerald-800 text-emerald-200 text-sm p-3">
          Invitation créée pour <span className="font-medium">{invitation.invitedEmail}</span>.
          <div className="mt-1">
            Token: <span className="font-mono">{invitation.invitationToken}</span>
          </div>
          <div className="mt-1">
            Lien:{" "}
            <span className="font-mono">
              /accept-invitation?token={encodeURIComponent(invitation.invitationToken)}
            </span>
          </div>
        </div>
      )}

      <section className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
        {loading ? (
          <p className="text-sm text-slate-400">Chargement...</p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2">
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="rounded-lg border border-slate-700 bg-slate-800/60 px-3 py-2 text-slate-100"
              />
              <input
                type="text"
                placeholder="Nom (optionnel)"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="rounded-lg border border-slate-700 bg-slate-800/60 px-3 py-2 text-slate-100"
              />
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <select
                value={role}
                onChange={(e) => {
                  const nextRole = e.target.value as "admin" | "member";
                  setRole(nextRole);
                  if (nextRole === "admin") {
                    setProfileId("");
                    setExtraPermissions([]);
                    setRevokedPermissions([]);
                  }
                }}
                className="rounded-lg border border-slate-700 bg-slate-800/60 px-3 py-2 text-slate-100"
              >
                <option value="member">member</option>
                <option value="admin">admin</option>
              </select>
              <select
                value={profileId}
                onChange={(e) => setProfileId(e.target.value)}
                disabled={adminRoleSelected}
                className="rounded-lg border border-slate-700 bg-slate-800/60 px-3 py-2 text-slate-100"
              >
                <option value="">Aucun profil</option>
                {profiles.map((profile) => (
                  <option key={profile.id} value={profile.id}>
                    {profile.name}
                  </option>
                ))}
              </select>
            </div>
            {adminRoleSelected && (
              <div className="rounded-lg border border-amber-700/40 bg-amber-900/20 px-3 py-2 text-sm text-amber-100">
                Un administrateur d’organisation possède automatiquement tous les droits. Aucun
                profil ni permission personnalisée ne peut lui être affecté.
              </div>
            )}
            <div className={`grid gap-4 md:grid-cols-2 ${adminRoleSelected ? "opacity-60" : ""}`}>
              <div>
                <p className="text-sm font-medium text-slate-300 mb-2">Permissions à ajouter</p>
                <div className="grid gap-1">
                  {catalog.map((permission) => (
                    <label key={`add-${permission}`} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        disabled={adminRoleSelected}
                        checked={extraPermissions.includes(permission)}
                        onChange={() =>
                          setExtraPermissions((previous) => togglePermission(previous, permission))
                        }
                      />
                      <span>
                        <span className="block text-slate-300">{getPermissionLabel(permission)}</span>
                        <span className="block font-mono text-xs text-slate-500">{permission}</span>
                      </span>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-300 mb-2">Permissions à retirer</p>
                <div className="grid gap-1">
                  {catalog.map((permission) => (
                    <label
                      key={`revoke-${permission}`}
                      className="flex items-center gap-2 text-sm"
                    >
                      <input
                        type="checkbox"
                        disabled={adminRoleSelected}
                        checked={revokedPermissions.includes(permission)}
                        onChange={() =>
                          setRevokedPermissions((previous) => togglePermission(previous, permission))
                        }
                      />
                      <span>
                        <span className="block text-slate-300">{getPermissionLabel(permission)}</span>
                        <span className="block font-mono text-xs text-slate-500">{permission}</span>
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-brand-600 px-4 py-2 text-white hover:bg-brand-500 disabled:opacity-50"
            >
              {saving ? "Invitation..." : "Inviter l’utilisateur"}
            </button>
          </form>
        )}
      </section>
    </div>
  );
}
