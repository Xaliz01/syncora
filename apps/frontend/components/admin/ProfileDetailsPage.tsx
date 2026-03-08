"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { useCallback, useEffect, useState } from "react";
import type { PermissionCode } from "@syncora/shared";
import * as adminApi from "@/lib/admin.api";
import { getPermissionLabel } from "@/lib/permissions-catalog";
import { useToast } from "@/components/ui/ToastProvider";

function togglePermission(list: PermissionCode[], permission: PermissionCode): PermissionCode[] {
  if (list.includes(permission)) return list.filter((item) => item !== permission);
  return [...list, permission];
}

export function ProfileDetailsPage({ profileId }: { profileId: string }) {
  const router = useRouter();
  const { showToast } = useToast();
  const [catalog, setCatalog] = useState<PermissionCode[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [permissions, setPermissions] = useState<PermissionCode[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      setIsEditing(false);
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
    try {
      await adminApi.updatePermissionProfile(profileId, {
        name,
        description: description.trim() || undefined,
        permissions
      });
      showToast("Profil mis à jour.");
      setIsEditing(false);
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
    try {
      await adminApi.deletePermissionProfile(profileId);
      showToast("Profil supprimé.");
      router.push("/settings/profiles");
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
          <p className="text-sm text-slate-500">Consultez ce profil de permissions.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsEditing((previous) => !previous)}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100"
          >
            {isEditing ? "Annuler" : "Modifier"}
          </button>
          <Link
            href="/settings/profiles"
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100"
          >
            Retour aux profils
          </Link>
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm p-3">
          {error}
        </div>
      )}

      <section className="rounded-xl border border-slate-200 bg-white p-4">
        {loading ? (
          <p className="text-sm text-slate-500">Chargement...</p>
        ) : (
          <div className="space-y-4">
            {!isEditing ? (
              <>
                <div className="grid gap-3 md:grid-cols-2 text-sm">
                  <div>
                    <span className="text-slate-400">Nom</span>
                    <p className="text-slate-700">{name}</p>
                  </div>
                  <div>
                    <span className="text-slate-400">Description</span>
                    <p className="text-slate-700">{description || "—"}</p>
                  </div>
                </div>
                <div>
                  <span className="text-sm text-slate-400">Permissions</span>
                  <div className="mt-2 grid gap-2 md:grid-cols-2">
                    {permissions.map((permission) => (
                      <div key={permission} className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
                        <div className="text-slate-700">{getPermissionLabel(permission)}</div>
                        <div className="text-xs text-slate-400 font-mono">{permission}</div>
                      </div>
                    ))}
                    {permissions.length === 0 && <p className="text-slate-500 text-sm">Aucune permission.</p>}
                  </div>
                </div>
              </>
            ) : (
              <form onSubmit={handleSave} className="space-y-4">
                <div className="grid gap-3 md:grid-cols-2">
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900"
                  />
                  <input
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Description (optionnel)"
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900"
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
                        <span className="block text-slate-700">{getPermissionLabel(permission)}</span>
                        <span className="block text-xs text-slate-400 font-mono">{permission}</span>
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
                    className="rounded-lg border border-red-300 px-4 py-2 text-red-700 hover:bg-red-50 disabled:opacity-50"
                  >
                    {deleting ? "Suppression..." : "Supprimer le profil"}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
