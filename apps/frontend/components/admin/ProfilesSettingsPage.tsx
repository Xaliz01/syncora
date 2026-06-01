"use client";

import Link from "next/link";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import type { PermissionProfileResponse } from "@syncora/shared";
import { TestDataBadgeIf } from "@/components/test-data/TestDataBadge";
import * as adminApi from "@/lib/admin.api";
import { PermissionGate } from "@/components/auth/PermissionGate";
import {
  filterListItems,
  ListCellDefault,
  ListCellMuted,
  ListCellPrimary,
  ListEmptyState,
  ListLoadingState,
  ListNoResults,
  ListPageError,
  ListPageHeader,
  ListPageRoot,
  ListPrimaryAction,
  ListRowLink,
  ListSearchField,
  ListTableShell,
  ListToolbar,
} from "@/components/ui/list-page";

const GRID = "md:grid-cols-[1.2fr_1.6fr_0.5fr]";

export function ProfilesSettingsPage() {
  const [profiles, setProfiles] = useState<PermissionProfileResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

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

  const filtered = useMemo(
    () =>
      filterListItems(profiles, search, (profile) => [
        profile.name,
        profile.description,
        String(profile.permissions.length),
      ]),
    [profiles, search],
  );

  return (
    <ListPageRoot>
      <ListPageHeader
        title="Profils"
        description="Liste des profils de permissions. Ouvrez un profil pour voir son détail."
        action={
          <PermissionGate permission="profiles.create">
            <ListPrimaryAction href="/settings/profiles/new">Créer un profil</ListPrimaryAction>
          </PermissionGate>
        }
      />

      {error ? (
        <ListPageError
          message={error}
          fallbackMessage="Erreur de chargement des profils"
          onRetry={() => void refresh()}
        />
      ) : null}

      <ListToolbar>
        <ListSearchField
          value={search}
          onChange={setSearch}
          placeholder="Filtrer par nom ou description…"
        />
        <Link
          href="/settings/permissions"
          className="text-sm text-brand-600 dark:text-brand-400 hover:underline font-medium self-center sm:ml-auto"
        >
          Catalogue des permissions
        </Link>
      </ListToolbar>

      {loading ? (
        <ListLoadingState />
      ) : profiles.length === 0 ? (
        <ListEmptyState
          message="Aucun profil."
          action={
            <PermissionGate permission="profiles.create">
              <Link
                href="/settings/profiles/new"
                className="text-sm text-brand-600 dark:text-brand-400 hover:underline font-medium"
              >
                Créer votre premier profil
              </Link>
            </PermissionGate>
          }
        />
      ) : filtered.length === 0 ? (
        <ListNoResults />
      ) : (
        <ListTableShell
          gridTemplateClass={GRID}
          headerCells={
            <>
              <span>Nom</span>
              <span>Description</span>
              <span>Permissions</span>
            </>
          }
        >
          {filtered.map((profile) => (
            <ListRowLink
              key={profile.id}
              href={`/settings/profiles/${profile.id}`}
              gridTemplateClass={GRID}
            >
              <ListCellPrimary>
                <span className="inline-flex items-center gap-2 min-w-0">
                  <span className="truncate">{profile.name}</span>
                  <TestDataBadgeIf isTestData={profile.isTestData} />
                </span>
              </ListCellPrimary>
              <ListCellMuted>{profile.description ?? "—"}</ListCellMuted>
              <ListCellDefault>{profile.permissions.length}</ListCellDefault>
            </ListRowLink>
          ))}
        </ListTableShell>
      )}
    </ListPageRoot>
  );
}
