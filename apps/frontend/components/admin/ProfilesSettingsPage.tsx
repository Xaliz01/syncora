"use client";

import Link from "next/link";
import React, { useCallback, useEffect, useState } from "react";
import type { PermissionProfileResponse } from "@syncora/shared";
import * as adminApi from "@/lib/admin.api";
import { PermissionGate } from "@/components/auth/PermissionGate";

export function ProfilesSettingsPage() {
  const [profiles, setProfiles] = useState<PermissionProfileResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const profilesRes = await adminApi.listPermissionProfiles();
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold">Profils</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Liste des profils de permissions. Ouvrez un profil pour voir son détail.
          </p>
        </div>
        <PermissionGate permission="profiles.create">
          <Link
            href="/settings/profiles/new"
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-500 transition self-start flex-shrink-0"
          >
            Créer un profil
          </Link>
        </PermissionGate>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm p-3">
          {error}
        </div>
      )}

      <section className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4">
        <div className="mb-3">
          <h2 className="font-semibold">Liste des profils</h2>
        </div>
        {loading ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">Chargement...</p>
        ) : profiles.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">Aucun profil.</p>
        ) : (
          <div className="rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="hidden md:grid md:grid-cols-[1.2fr_1.6fr_auto] gap-3 border-b border-slate-200 dark:border-slate-700 px-4 py-3 text-xs uppercase tracking-wide text-slate-400 dark:text-slate-500">
              <span>Nom</span>
              <span>Description</span>
              <span>Permissions</span>
            </div>
            {profiles.map((profile) => (
              <div
                key={profile.id}
                className="grid md:grid-cols-[1.2fr_1.6fr_auto] gap-2 md:gap-3 items-center border-b border-slate-200 dark:border-slate-700 px-4 py-3 last:border-b-0"
              >
                <Link
                  href={`/settings/profiles/${profile.id}`}
                  className="font-medium text-brand-600 dark:text-brand-400 hover:text-brand-500 hover:underline"
                >
                  {profile.name}
                </Link>
                <span className="text-sm text-slate-500 dark:text-slate-400">
                  {profile.description ?? "—"}
                </span>
                <span className="text-sm text-slate-500 dark:text-slate-400">
                  {profile.permissions.length}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
