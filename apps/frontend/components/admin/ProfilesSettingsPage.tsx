"use client";

import Link from "next/link";
import React, { useCallback, useEffect, useState } from "react";
import type { PermissionProfileResponse } from "@syncora/shared";
import * as adminApi from "@/lib/admin.api";

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
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold mb-1">Paramètres → Profils</h1>
          <p className="text-sm text-slate-500">
            Liste des profils de permissions. Ouvrez un profil pour voir son détail.
          </p>
        </div>
        <Link
          href="/settings/profiles/new"
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm text-white hover:bg-brand-500"
        >
          Créer un profil
        </Link>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm p-3">
          {error}
        </div>
      )}

      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="mb-3">
          <h2 className="font-semibold">Liste des profils</h2>
        </div>
        {loading ? (
          <p className="text-sm text-slate-500">Chargement...</p>
        ) : profiles.length === 0 ? (
          <p className="text-sm text-slate-500">Aucun profil.</p>
        ) : (
          <div className="rounded-lg border border-slate-200 overflow-hidden">
            <div className="hidden md:grid md:grid-cols-[1.2fr_1.6fr_auto_auto] gap-3 border-b border-slate-200 px-4 py-3 text-xs uppercase tracking-wide text-slate-400">
              <span>Nom</span>
              <span>Description</span>
              <span>Permissions</span>
              <span>Détail</span>
            </div>
            {profiles.map((profile) => (
              <div
                key={profile.id}
                className="grid md:grid-cols-[1.2fr_1.6fr_auto_auto] gap-3 items-center border-b border-slate-200 px-4 py-3 last:border-b-0"
              >
                <span className="font-medium">{profile.name}</span>
                <span className="text-sm text-slate-500">{profile.description ?? "—"}</span>
                <span className="text-sm text-slate-500">{profile.permissions.length}</span>
                <Link
                  href={`/settings/profiles/${profile.id}`}
                  className="text-sm text-brand-600 hover:text-brand-700 hover:underline"
                >
                  Ouvrir
                </Link>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
