"use client";

import React, { useCallback, useEffect, useState } from "react";
import type { PermissionCode, PermissionProfileResponse } from "@syncora/shared";
import * as adminApi from "@/lib/admin.api";

function togglePermission(list: PermissionCode[], permission: PermissionCode): PermissionCode[] {
  if (list.includes(permission)) return list.filter((item) => item !== permission);
  return [...list, permission];
}

export function ProfilesSettingsPage() {
  const [catalog, setCatalog] = useState<PermissionCode[]>([]);
  const [profiles, setProfiles] = useState<PermissionProfileResponse[]>([]);
  const [profileName, setProfileName] = useState("");
  const [profileDescription, setProfileDescription] = useState("");
  const [profilePermissions, setProfilePermissions] = useState<PermissionCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

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
      setError(err instanceof Error ? err.message : "Erreur de chargement des profils");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      await adminApi.createPermissionProfile({
        name: profileName,
        description: profileDescription.trim() || undefined,
        permissions: profilePermissions
      });
      setProfileName("");
      setProfileDescription("");
      setProfilePermissions([]);
      setNotice("Profil créé.");
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible de créer le profil");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (profileId: string) => {
    setError(null);
    setNotice(null);
    try {
      await adminApi.deletePermissionProfile(profileId);
      setNotice("Profil supprimé.");
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible de supprimer le profil");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold mb-1">Paramètres → Profils</h1>
        <p className="text-sm text-slate-400">
          Créez et gérez les profils de permissions de votre organisation.
        </p>
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
        <h2 className="font-semibold mb-3">Créer un profil</h2>
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            <input
              type="text"
              placeholder="Nom du profil"
              value={profileName}
              onChange={(e) => setProfileName(e.target.value)}
              required
              className="rounded-lg border border-slate-700 bg-slate-800/60 px-3 py-2 text-slate-100"
            />
            <input
              type="text"
              placeholder="Description (optionnel)"
              value={profileDescription}
              onChange={(e) => setProfileDescription(e.target.value)}
              className="rounded-lg border border-slate-700 bg-slate-800/60 px-3 py-2 text-slate-100"
            />
          </div>
          <div className="grid gap-2 md:grid-cols-2">
            {catalog.map((permission) => (
              <label key={permission} className="flex items-center gap-2 text-sm text-slate-300">
                <input
                  type="checkbox"
                  checked={profilePermissions.includes(permission)}
                  onChange={() =>
                    setProfilePermissions((previous) => togglePermission(previous, permission))
                  }
                />
                <span className="font-mono">{permission}</span>
              </label>
            ))}
          </div>
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-brand-600 px-4 py-2 text-white hover:bg-brand-500 disabled:opacity-50"
          >
            {saving ? "Création..." : "Créer le profil"}
          </button>
        </form>
      </section>

      <section className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold">Profils existants</h2>
          <button
            type="button"
            onClick={() => void refresh()}
            className="rounded-lg border border-slate-700 px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-800"
          >
            Rafraîchir
          </button>
        </div>
        {loading ? (
          <p className="text-sm text-slate-400">Chargement...</p>
        ) : profiles.length === 0 ? (
          <p className="text-sm text-slate-400">Aucun profil.</p>
        ) : (
          <div className="space-y-3">
            {profiles.map((profile) => (
              <article
                key={profile.id}
                className="rounded-lg border border-slate-700 bg-slate-900/40 p-3 space-y-2"
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
                    onClick={() => void handleDelete(profile.id)}
                    className="text-sm text-red-300 hover:text-red-200"
                  >
                    Supprimer
                  </button>
                </div>
                <div className="flex flex-wrap gap-1">
                  {profile.permissions.map((permission) => (
                    <span
                      key={`${profile.id}-${permission}`}
                      className="rounded bg-slate-800 px-2 py-0.5 text-xs text-slate-300 font-mono"
                    >
                      {permission}
                    </span>
                  ))}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
