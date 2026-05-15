"use client";

import { useRouter } from "next/navigation";
import React, { useCallback, useEffect, useState } from "react";
import type { PermissionCode, PermissionProfileResponse } from "@syncora/shared";
import * as adminApi from "@/lib/admin.api";
import { getPermissionLabel } from "@/lib/permissions-catalog";
import { useToast } from "@/components/ui/ToastProvider";

function togglePermission(list: PermissionCode[], permission: PermissionCode): PermissionCode[] {
  if (list.includes(permission)) return list.filter((item) => item !== permission);
  return [...list, permission];
}

export function CreateUserPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [catalog, setCatalog] = useState<PermissionCode[]>([]);
  const [profiles, setProfiles] = useState<PermissionProfileResponse[]>([]);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<"admin" | "member">("member");
  const [profileId, setProfileId] = useState("");
  const [selectedPermissions, setSelectedPermissions] = useState<PermissionCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const adminRoleSelected = role === "admin";

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [catalogRes, profilesRes] = await Promise.all([
        adminApi.getPermissionsCatalog(),
        adminApi.listPermissionProfiles(),
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
        extraPermissions: adminRoleSelected
          ? []
          : selectedPermissions.filter((permission) => {
              const profilePermissions =
                profiles.find((profile) => profile.id === profileId)?.permissions ?? [];
              return !profilePermissions.includes(permission);
            }),
        revokedPermissions: adminRoleSelected
          ? []
          : (profiles.find((profile) => profile.id === profileId)?.permissions ?? []).filter(
              (permission) => !selectedPermissions.includes(permission),
            ),
      });
      const invitationUrl = `${window.location.origin}/accept-invitation?token=${encodeURIComponent(
        result.invitation.invitationToken,
      )}`;
      await navigator.clipboard.writeText(invitationUrl).catch(() => undefined);
      showToast("Invitation créée. Lien d'activation copié (2s).");
      setEmail("");
      setName("");
      setRole("member");
      setProfileId("");
      setSelectedPermissions([]);
      router.push("/users");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible d'inviter l'utilisateur");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-semibold">Inviter un utilisateur</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Invitez un utilisateur dans votre organisation et pré-configurez ses droits.
        </p>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm p-3">
          {error}
        </div>
      )}

      <section className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 sm:p-5">
        {loading ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">Chargement...</p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
              <input
                type="text"
                placeholder="Nom (optionnel)"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <select
                value={role}
                onChange={(e) => {
                  const nextRole = e.target.value as "admin" | "member";
                  setRole(nextRole);
                  if (nextRole === "admin") {
                    setProfileId("");
                    setSelectedPermissions([]);
                  }
                }}
                className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:border-brand-500 focus:outline-none"
              >
                <option value="member">Membre</option>
                <option value="admin">Administrateur</option>
              </select>
              <select
                value={profileId}
                onChange={(e) => {
                  const nextProfileId = e.target.value;
                  setProfileId(nextProfileId);
                  const profilePermissions =
                    profiles.find((profile) => profile.id === nextProfileId)?.permissions ?? [];
                  setSelectedPermissions(profilePermissions);
                }}
                disabled={adminRoleSelected}
                className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:border-brand-500 focus:outline-none"
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
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
                Un administrateur d&apos;organisation possède automatiquement tous les droits. Aucun
                profil ni permission personnalisée ne peut lui être affecté.
              </div>
            )}
            <div className={`${adminRoleSelected ? "opacity-60" : ""}`}>
              <div>
                <p className="text-sm font-medium text-slate-700 dark:text-slate-200 mb-2">
                  Permissions
                </p>
                <div className="grid gap-1 sm:grid-cols-2">
                  {catalog.map((permission) => (
                    <label key={permission} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        disabled={adminRoleSelected}
                        checked={selectedPermissions.includes(permission)}
                        onChange={() =>
                          setSelectedPermissions((previous) =>
                            togglePermission(previous, permission),
                          )
                        }
                      />
                      <span>
                        <span className="block text-slate-700 dark:text-slate-200">
                          {getPermissionLabel(permission)}
                        </span>
                        <span className="block font-mono text-xs text-slate-400 dark:text-slate-500">
                          {permission}
                        </span>
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-500 disabled:opacity-50 transition"
            >
              {saving ? "Invitation..." : "Inviter l'utilisateur"}
            </button>
          </form>
        )}
      </section>
    </div>
  );
}
