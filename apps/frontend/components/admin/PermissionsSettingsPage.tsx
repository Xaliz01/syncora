"use client";

import Link from "next/link";
import React, { useCallback, useEffect, useState } from "react";
import type { PermissionCode } from "@planwise/shared";
import * as adminApi from "@/lib/admin.api";
import { getPermissionLabel } from "@/lib/permissions-catalog";
import {
  ListLoadingState,
  ListPageError,
  ListPageHeader,
  ListPageRoot,
} from "@/components/ui/list-page";

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
    <ListPageRoot>
      <ListPageHeader
        title="Permissions"
        description="Référence des permissions disponibles dans l'application."
        action={
          <Link
            href="/settings/profiles"
            className="rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition self-start flex-shrink-0"
          >
            Retour aux profils
          </Link>
        }
      />

      {error ? (
        <ListPageError
          message={error}
          fallbackMessage="Erreur de chargement des permissions"
          onRetry={() => void loadCatalog()}
        />
      ) : null}

      {loading ? (
        <ListLoadingState />
      ) : (
        <section className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4">
          <div className="grid gap-2 sm:grid-cols-2">
            {catalog.map((permission) => (
              <div
                key={permission}
                className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-sm text-slate-700 dark:text-slate-200"
              >
                <div className="text-slate-800 dark:text-slate-100">
                  {getPermissionLabel(permission)}
                </div>
                <div className="text-xs text-slate-400 dark:text-slate-500 font-mono">
                  {permission}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </ListPageRoot>
  );
}
