"use client";

import Link from "next/link";
import React, { useCallback, useEffect, useState } from "react";
import type { PermissionCode } from "@syncora/shared";
import * as adminApi from "@/lib/admin.api";
import { getPermissionLabel } from "@/lib/permissions-catalog";

function togglePermission(list: PermissionCode[], permission: PermissionCode): PermissionCode[] {
  if (list.includes(permission)) return list.filter((item) => item !== permission);
  return [...list, permission];
}

export function ProfileDetailsPage({ profileId }: { profileId: string }) {
  const [catalog, setCatalog] = useState<PermissionCode[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [permissions, setPermissions] = useState<PermissionCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [catalogRes, profileRes] = await Promise.all([
        adminApi.getPermissionsCatalog(),
        adminApi.getPermissionProfile(profileId)
      ]);
      setCatalog(catalogRes.availablePermissions);
      setName(profileRes.name);
      setDescription(profileRes.description ?? "");
      setPermissions(profileRes.permissions);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur de chargement du profil");
    } finally {
      setLoading(false);
    }
  }, [profileId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      await adminApi.updatePermissionProfile(profileId, {
        name,
        description: description.trim() || undefined,
        permissions
      });
      setNotice("Profil mis à jour.");
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible de mettre à jour ce profil");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    setError(null);
    setNotice(null);
    try {
      await adminApi.deletePermissionProfile(profileId);
      setNotice("Profil supprimé.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible de supprimer ce profil");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold mb-1">Fiche profil</h1>
          <p className="text-sm text-slate-400">Consultez et mettez à jour ce profil de permissions.</p>
        </div>
        <Link
          href="/settings/profiles"
          className="rounded-lg border border-slate-700 px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-800"
        >
          Retour aux profils
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
        {loading ? (
          <p className="text-sm text-slate-400">Chargement...</p>
        ) : (
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="rounded-lg border border-slate-700 bg-slate-800/60 px-3 py-2 text-slate-100"
              />
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Description (optionnel)"
                className="rounded-lg border border-slate-700 bg-slate-800/60 px-3 py-2 text-slate-100"
              />
            </div>
            <div className="grid gap-2 md:grid-cols-2">
              {catalog.map((permission) => (
                <label key={permission} className="flex items-start gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={permissions.includes(permission)}
                    onChange={() =>
                      setPermissions((previous) => togglePermission(previous, permission))
                    }
                  />
                  <span>
                    <span className="block text-slate-200">{getPermissionLabel(permission)}</span>
                    <span className="block text-xs text-slate-500 font-mono">{permission}</span>
                  </span>
                </label>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="submit"
                disabled={saving}
                className="rounded-lg bg-brand-600 px-4 py-2 text-white hover:bg-brand-500 disabled:opacity-50"
              >
                {saving ? "Enregistrement..." : "Enregistrer"}
              </button>
              <button
                type="button"
                onClick={() => void handleDelete()}
                disabled={deleting}
                className="rounded-lg border border-red-800 px-4 py-2 text-red-300 hover:bg-red-900/20 disabled:opacity-50"
              >
                {deleting ? "Suppression..." : "Supprimer le profil"}
              </button>
            </div>
          </form>
        )}
      </section>
    </div>
  );
}
