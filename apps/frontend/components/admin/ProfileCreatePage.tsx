"use client";

import { useRouter, useSearchParams } from "next/navigation";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import type { PermissionCode } from "@planwise/shared";
import * as adminApi from "@/lib/admin.api";
import { getPermissionLabel } from "@/lib/permissions-catalog";
import { useToast } from "@/components/ui/ToastProvider";
import {
  FormDialogCancelButton,
  FormDialogPrimaryButton,
  FormDialogSection,
  FormPage,
  formFieldInputClassName,
  formFieldLabelClassName,
} from "@/components/ui/FormDialog";

function togglePermission(list: PermissionCode[], permission: PermissionCode): PermissionCode[] {
  if (list.includes(permission)) return list.filter((item) => item !== permission);
  return [...list, permission];
}

function safeInternalReturnPath(raw: string | null): string | null {
  if (!raw) return null;
  const path = raw.trim();
  if (!path.startsWith("/") || path.startsWith("//")) return null;
  return path;
}

export function ProfileFormPage({ profileId }: { profileId?: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast } = useToast();
  const isEdit = Boolean(profileId);
  const [catalog, setCatalog] = useState<PermissionCode[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [permissions, setPermissions] = useState<PermissionCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const returnTo = useMemo(
    () => safeInternalReturnPath(searchParams.get("returnTo")),
    [searchParams],
  );
  const detailHref = profileId ? `/settings/profiles/${profileId}` : "/settings/profiles";
  const backHref = isEdit ? detailHref : (returnTo ?? "/settings/profiles");
  const backLabel = isEdit
    ? name.trim() || "Fiche profil"
    : returnTo === "/users/new"
      ? "Invitation"
      : "Profils";

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const catalogRes = await adminApi.getPermissionsCatalog();
      setCatalog(catalogRes.availablePermissions);
      if (profileId) {
        const profileRes = await adminApi.getPermissionProfile(profileId);
        setName(profileRes.name);
        setDescription(profileRes.description ?? "");
        setPermissions(profileRes.permissions);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur de chargement");
    } finally {
      setLoading(false);
    }
  }, [profileId]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      if (isEdit && profileId) {
        await adminApi.updatePermissionProfile(profileId, {
          name,
          description: description.trim() || undefined,
          permissions,
        });
        showToast("Profil mis à jour.");
        router.push(detailHref);
      } else {
        await adminApi.createPermissionProfile({
          name,
          description: description.trim() || undefined,
          permissions,
        });
        showToast("Profil créé.");
        router.push(backHref);
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : isEdit
            ? "Impossible de mettre à jour ce profil"
            : "Impossible de créer le profil",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <FormPage
      title={isEdit ? "Modifier le profil" : "Créer un profil"}
      description={
        isEdit
          ? "Mettez à jour le nom, la description et les permissions."
          : "Définissez un nouveau profil de permissions pour l'organisation."
      }
      breadcrumb={{ href: backHref, label: backLabel }}
      error={error || undefined}
      onSubmit={handleSubmit}
      footer={
        <>
          <FormDialogCancelButton onClick={() => router.push(backHref)} disabled={saving} />
          <FormDialogPrimaryButton type="submit" disabled={loading || saving}>
            {saving ? "Enregistrement…" : isEdit ? "Enregistrer" : "Créer le profil"}
          </FormDialogPrimaryButton>
        </>
      }
    >
      {loading ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">Chargement...</p>
      ) : (
        <>
          <FormDialogSection title="Informations générales">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className={formFieldLabelClassName}>Nom du profil</label>
                <input
                  type="text"
                  placeholder="Technicien"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className={formFieldInputClassName}
                />
              </div>
              <div>
                <label className={formFieldLabelClassName}>Description (optionnel)</label>
                <input
                  type="text"
                  placeholder="Droits accordés à ce profil"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className={formFieldInputClassName}
                />
              </div>
            </div>
          </FormDialogSection>

          <FormDialogSection title="Permissions">
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
                    <span className="block text-slate-700 dark:text-slate-200">
                      {getPermissionLabel(permission)}
                    </span>
                    <span className="block text-xs text-slate-400 dark:text-slate-500 font-mono">
                      {permission}
                    </span>
                  </span>
                </label>
              ))}
            </div>
          </FormDialogSection>
        </>
      )}
    </FormPage>
  );
}

/** @deprecated use ProfileFormPage */
export const ProfileCreatePage = ProfileFormPage;
