"use client";

import Link from "next/link";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  DEFAULT_PERMISSION_PROFILE_PRESETS,
  type PermissionProfileResponse,
} from "@planwise/shared";
import { TestDataBadgeIf } from "@/components/test-data/TestDataBadge";
import * as adminApi from "@/lib/admin.api";
import { PermissionGate } from "@/components/auth/PermissionGate";
import { ImportDefaultsDialog } from "@/components/settings/ImportDefaultsDialog";
import { useToast } from "@/components/ui/ToastProvider";
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
  const { showToast } = useToast();
  const [profiles, setProfiles] = useState<PermissionProfileResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [importOpen, setImportOpen] = useState(false);
  const [importing, setImporting] = useState(false);

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

  const existingNames = useMemo(
    () => new Set(profiles.map((p) => p.name.trim().toLowerCase())),
    [profiles],
  );

  const importItems = useMemo(
    () =>
      DEFAULT_PERMISSION_PROFILE_PRESETS.map((p) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        category: p.category,
        meta: `${p.permissions.length} permission${p.permissions.length > 1 ? "s" : ""}`,
        alreadyExists: existingNames.has(p.name.trim().toLowerCase()),
      })),
    [existingNames],
  );

  const filtered = useMemo(
    () =>
      filterListItems(profiles, search, (profile) => [
        profile.name,
        profile.description,
        String(profile.permissions.length),
      ]),
    [profiles, search],
  );

  const handleImport = async (ids: string[]) => {
    setImporting(true);
    let ok = 0;
    let failed = 0;
    try {
      for (const id of ids) {
        const preset = DEFAULT_PERMISSION_PROFILE_PRESETS.find((p) => p.id === id);
        if (!preset) continue;
        if (existingNames.has(preset.name.trim().toLowerCase())) continue;
        try {
          await adminApi.createPermissionProfile({
            name: preset.name,
            description: preset.description,
            permissions: [...preset.permissions],
          });
          ok += 1;
        } catch {
          failed += 1;
        }
      }
      await refresh();
      setImportOpen(false);
      if (ok > 0) {
        showToast(
          `${ok} profil${ok > 1 ? "s" : ""} importé${ok > 1 ? "s" : ""}${
            failed > 0 ? ` (${failed} échec${failed > 1 ? "s" : ""})` : ""
          }.`,
        );
      } else if (failed > 0) {
        showToast("Aucun profil importé.", "error");
      }
    } finally {
      setImporting(false);
    }
  };

  return (
    <ListPageRoot>
      <ListPageHeader
        title="Profils"
        description="Liste des profils de permissions. Importez des modèles prêts à l’emploi ou créez le vôtre."
        action={
          <div className="flex flex-wrap gap-2">
            <PermissionGate permission="profiles.create">
              <button
                type="button"
                onClick={() => setImportOpen(true)}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                Importer depuis la librairie
              </button>
            </PermissionGate>
            <PermissionGate permission="profiles.create">
              <ListPrimaryAction href="/settings/profiles/new">Créer un profil</ListPrimaryAction>
            </PermissionGate>
          </div>
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
              <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center">
                <button
                  type="button"
                  onClick={() => setImportOpen(true)}
                  className="text-sm text-brand-600 dark:text-brand-400 hover:underline font-medium"
                >
                  Importer des modèles prêts à l’emploi
                </button>
                <span className="text-slate-400 hidden sm:inline">ou</span>
                <Link
                  href="/settings/profiles/new"
                  className="text-sm text-brand-600 dark:text-brand-400 hover:underline font-medium"
                >
                  Créer votre premier profil
                </Link>
              </div>
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

      <ImportDefaultsDialog
        open={importOpen}
        onClose={() => setImportOpen(false)}
        title="Importer des profils"
        description="Sélectionnez les rôles types (terrain, bureau, stock…). Les profils déjà présents (même nom) sont ignorés."
        items={importItems}
        importing={importing}
        onImport={handleImport}
      />
    </ListPageRoot>
  );
}
