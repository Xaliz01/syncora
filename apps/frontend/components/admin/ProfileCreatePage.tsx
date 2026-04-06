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
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold">Créer un profil</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Définissez un nouveau profil de permissions pour l&apos;organisation.
          </p>
        </div>
        <Link
          href="/settings/profiles"
          className="rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition self-start flex-shrink-0"
        >
          Retour aux profils
        </Link>
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
                type="text"
                placeholder="Nom du profil"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
              <input
                type="text"
                placeholder="Description (optionnel)"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
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
                    <span className="block text-slate-700 dark:text-slate-200">{getPermissionLabel(permission)}</span>
                    <span className="block text-xs text-slate-400 dark:text-slate-500 font-mono">{permission}</span>
                  </span>
                </label>
              ))}
            </div>

            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-500 disabled:opacity-50 transition"
            >
              {saving ? "Création..." : "Créer le profil"}
            </button>
          </form>
        )}
      </section>
    </div>
  );
}
