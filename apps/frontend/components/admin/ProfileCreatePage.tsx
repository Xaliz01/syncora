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

export function ProfileCreatePage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [catalog, setCatalog] = useState<PermissionCode[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [permissions, setPermissions] = useState<PermissionCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadCatalog = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await adminApi.getPermissionsCatalog();
      setCatalog(result.availablePermissions);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur de chargement du catalogue");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCatalog();
  }, [loadCatalog]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await adminApi.createPermissionProfile({
        name,
        description: description.trim() || undefined,
        permissions
      });
      showToast("Profil créé.");
      router.push("/settings/profiles");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible de créer le profil");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold mb-1">Créer un profil</h1>
          <p className="text-sm text-slate-500">
            Définissez un nouveau profil de permissions pour l’organisation.
          </p>
        </div>
        <Link
          href="/settings/profiles"
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100"
        >
          Retour aux profils
        </Link>
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
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2">
              <input
                type="text"
                placeholder="Nom du profil"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900"
              />
              <input
                type="text"
                placeholder="Description (optionnel)"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
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

            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-brand-600 px-4 py-2 text-white hover:bg-brand-500 disabled:opacity-50"
            >
              {saving ? "Création..." : "Créer le profil"}
            </button>
          </form>
        )}
      </section>
    </div>
  );
}
