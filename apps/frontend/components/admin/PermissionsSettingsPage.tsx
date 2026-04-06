"use client";

import React, { useCallback, useEffect, useState } from "react";
import type { PermissionCode } from "@syncora/shared";
import * as adminApi from "@/lib/admin.api";
import { getPermissionLabel } from "@/lib/permissions-catalog";

export function PermissionsSettingsPage() {
  const [catalog, setCatalog] = useState<PermissionCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadCatalog = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const catalogRes = await adminApi.getPermissionsCatalog();
      setCatalog(catalogRes.availablePermissions);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur de chargement des permissions");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCatalog();
  }, [loadCatalog]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-semibold">Permissions</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Référence des permissions disponibles dans l&apos;application.
        </p>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm p-3">
          {error}
        </div>
      )}

      <section className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4">
        <h2 className="font-semibold mb-3">Catalogue des permissions</h2>
        {loading ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">Chargement...</p>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            {catalog.map((permission) => (
              <div
                key={permission}
                className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-sm text-slate-700 dark:text-slate-200"
              >
                <div className="text-slate-800 dark:text-slate-100">{getPermissionLabel(permission)}</div>
                <div className="text-xs text-slate-400 dark:text-slate-500 font-mono">{permission}</div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
