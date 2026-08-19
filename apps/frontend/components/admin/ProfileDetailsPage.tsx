"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { useCallback, useEffect, useState } from "react";
import type { PermissionCode } from "@planwise/shared";
import * as adminApi from "@/lib/admin.api";
import { getPermissionLabel } from "@/lib/permissions-catalog";
import { useToast } from "@/components/ui/ToastProvider";
import { usePermissions } from "@/lib/hooks/usePermissions";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { PageBreadcrumb } from "@/components/ui/FormDialog";

export function ProfileDetailsPage({ profileId }: { profileId: string }) {
  const router = useRouter();
  const { showToast } = useToast();
  const { can } = usePermissions();
  const confirm = useConfirm();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [permissions, setPermissions] = useState<PermissionCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const profileRes = await adminApi.getPermissionProfile(profileId);
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

  const handleDelete = async () => {
    const ok = await confirm({
      title: "Supprimer ce profil ?",
      description: "Les utilisateurs qui l’utilisent devront être réaffectés.",
      confirmLabel: "Supprimer",
      variant: "danger",
    });
    if (!ok) return;
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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <PageBreadcrumb href="/settings/profiles" label="Profils" />
        <div className="flex flex-wrap gap-2">
          {can("profiles.update") && (
            <Link
              href={`/settings/profiles/${profileId}/edit`}
              className="rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              Modifier
            </Link>
          )}
          {can("profiles.delete") && (
            <button
              type="button"
              onClick={() => void handleDelete()}
              disabled={deleting}
              className="rounded-lg border border-red-300 px-3 py-1.5 text-sm text-red-700 hover:bg-red-50 disabled:opacity-50"
            >
              {deleting ? "Suppression…" : "Supprimer"}
            </button>
          )}
        </div>
      </div>

      <div>
        <h1 className="text-xl sm:text-2xl font-semibold mb-1">
          {loading ? "Fiche profil" : name || "Fiche profil"}
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Consultez ce profil de permissions.
        </p>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm p-3">
          {error}
        </div>
      )}

      <section className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4">
        {loading ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">Chargement...</p>
        ) : (
          <div className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2 text-sm">
              <div>
                <span className="text-slate-400 dark:text-slate-500">Nom</span>
                <p className="text-slate-700 dark:text-slate-200">{name}</p>
              </div>
              <div>
                <span className="text-slate-400 dark:text-slate-500">Description</span>
                <p className="text-slate-700 dark:text-slate-200">{description || "—"}</p>
              </div>
            </div>
            <div>
              <span className="text-sm text-slate-400 dark:text-slate-500">Permissions</span>
              <div className="mt-2 grid gap-2 md:grid-cols-2">
                {permissions.map((permission) => (
                  <div
                    key={permission}
                    className="rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2"
                  >
                    <div className="text-slate-700 dark:text-slate-200">
                      {getPermissionLabel(permission)}
                    </div>
                    <div className="text-xs text-slate-400 dark:text-slate-500 font-mono">
                      {permission}
                    </div>
                  </div>
                ))}
                {permissions.length === 0 && (
                  <p className="text-slate-500 dark:text-slate-400 text-sm">Aucune permission.</p>
                )}
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
