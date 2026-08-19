"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  DEFAULT_PERMISSION_PROFILE_PRESETS,
  type PermissionCode,
  type PermissionProfileResponse,
} from "@planwise/shared";
import * as adminApi from "@/lib/admin.api";
import * as subscriptionsApi from "@/lib/subscriptions.api";
import { getPermissionLabel } from "@/lib/permissions-catalog";
import { countOrganizationUserSeats } from "@/lib/organization-user-status";
import { PermissionGate } from "@/components/auth/PermissionGate";
import { ImportDefaultsDialog } from "@/components/settings/ImportDefaultsDialog";
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

export function CreateUserPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [catalog, setCatalog] = useState<PermissionCode[]>([]);
  const [profiles, setProfiles] = useState<PermissionProfileResponse[]>([]);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<"admin" | "member">("member");
  const [profileId, setProfileId] = useState("");
  const [selectedPermissions, setSelectedPermissions] = useState<PermissionCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [seatLimit, setSeatLimit] = useState<{ current: number; max: number } | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const adminRoleSelected = role === "admin";
  const atSeatLimit = seatLimit !== null && seatLimit.current >= seatLimit.max;
  const noProfiles = !loading && profiles.length === 0;

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [catalogRes, profilesRes, usersRes, subscriptionRes] = await Promise.all([
        adminApi.getPermissionsCatalog(),
        adminApi.listPermissionProfiles(),
        adminApi.listOrganizationUsers(),
        subscriptionsApi.getSubscriptionCurrent().catch(() => null),
      ]);
      setCatalog(catalogRes.availablePermissions);
      setProfiles(profilesRes);
      if (subscriptionRes?.hasAccess) {
        setSeatLimit({
          current: countOrganizationUserSeats(usersRes.users),
          max: subscriptionRes.maxUsers,
        });
      } else {
        setSeatLimit(null);
      }
      return profilesRes;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur de chargement");
      return [] as PermissionProfileResponse[];
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

  const selectProfile = useCallback((nextProfileId: string, list: PermissionProfileResponse[]) => {
    setProfileId(nextProfileId);
    const profilePermissions =
      list.find((profile) => profile.id === nextProfileId)?.permissions ?? [];
    setSelectedPermissions(profilePermissions);
  }, []);

  const handleImport = async (ids: string[]) => {
    setImporting(true);
    let ok = 0;
    let failed = 0;
    let firstCreatedId: string | null = null;
    try {
      for (const id of ids) {
        const preset = DEFAULT_PERMISSION_PROFILE_PRESETS.find((p) => p.id === id);
        if (!preset) continue;
        if (existingNames.has(preset.name.trim().toLowerCase())) continue;
        try {
          const created = await adminApi.createPermissionProfile({
            name: preset.name,
            description: preset.description,
            permissions: [...preset.permissions],
          });
          ok += 1;
          if (!firstCreatedId) firstCreatedId = created.id;
        } catch {
          failed += 1;
        }
      }
      const nextProfiles = await refresh();
      setImportOpen(false);
      if (firstCreatedId) {
        selectProfile(firstCreatedId, nextProfiles);
      } else if (nextProfiles[0]) {
        selectProfile(nextProfiles[0].id, nextProfiles);
      }
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

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const result = await adminApi.inviteOrganizationUser({
        email,
        name: name.trim() || undefined,
        role,
        profileId: adminRoleSelected ? undefined : profileId || undefined,
        extraPermissions: adminRoleSelected
          ? []
          : selectedPermissions.filter((permission) => {
              const profilePermissions =
                profiles.find((profile) => profile.id === profileId)?.permissions ?? [];
              return !profilePermissions.includes(permission);
            }),
        revokedPermissions: adminRoleSelected
          ? []
          : (profiles.find((profile) => profile.id === profileId)?.permissions ?? []).filter(
              (permission) => !selectedPermissions.includes(permission),
            ),
      });
      showToast(
        result.emailSent
          ? "Invitation envoyée par e-mail."
          : "Invitation créée, mais l'e-mail n'a pas pu être envoyé. Vous pourrez le renvoyer depuis la liste des utilisateurs.",
        result.emailSent ? undefined : "error",
      );
      setEmail("");
      setName("");
      setRole("member");
      setProfileId("");
      setSelectedPermissions([]);
      router.push("/users");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible d'inviter l'utilisateur");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <FormPage
        title="Inviter un utilisateur"
        description="Invitez un utilisateur : un e-mail avec le lien d'activation lui sera envoyé."
        breadcrumb={{ href: "/users", label: "Utilisateurs" }}
        error={error || undefined}
        onSubmit={handleSubmit}
        footer={
          <>
            <FormDialogCancelButton onClick={() => router.push("/users")} disabled={saving} />
            <FormDialogPrimaryButton type="submit" disabled={loading || saving || atSeatLimit}>
              {saving ? "Invitation…" : "Inviter l'utilisateur"}
            </FormDialogPrimaryButton>
          </>
        }
      >
        {atSeatLimit && (
          <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-100 text-sm p-3">
            Limite atteinte ({seatLimit?.current} / {seatLimit?.max} utilisateurs).{" "}
            <Link href="/subscription" className="font-medium underline hover:no-underline">
              Ajoutez des utilisateurs supplémentaires
            </Link>{" "}
            depuis la page Abonnement.
          </div>
        )}

        {loading ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">Chargement...</p>
        ) : (
          <>
            <FormDialogSection title="Utilisateur">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className={formFieldLabelClassName}>Email</label>
                  <input
                    type="email"
                    placeholder="utilisateur@exemple.fr"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className={formFieldInputClassName}
                  />
                </div>
                <div>
                  <label className={formFieldLabelClassName}>Nom (optionnel)</label>
                  <input
                    type="text"
                    placeholder="Prénom Nom"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className={formFieldInputClassName}
                  />
                </div>
              </div>
            </FormDialogSection>

            <FormDialogSection title="Rôle et profil">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className={formFieldLabelClassName}>Rôle</label>
                  <select
                    value={role}
                    onChange={(e) => {
                      const nextRole = e.target.value as "admin" | "member";
                      setRole(nextRole);
                      if (nextRole === "admin") {
                        setProfileId("");
                        setSelectedPermissions([]);
                      }
                    }}
                    className={formFieldInputClassName}
                  >
                    <option value="member">Membre</option>
                    <option value="admin">Administrateur</option>
                  </select>
                </div>
                <div>
                  <label className={formFieldLabelClassName}>Profil de permissions</label>
                  <select
                    value={profileId}
                    onChange={(e) => selectProfile(e.target.value, profiles)}
                    disabled={adminRoleSelected}
                    className={formFieldInputClassName}
                  >
                    <option value="">Aucun profil</option>
                    {profiles.map((profile) => (
                      <option key={profile.id} value={profile.id}>
                        {profile.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              {!adminRoleSelected && noProfiles && (
                <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950/50 px-3 py-3 text-sm text-slate-600 dark:text-slate-300">
                  <p className="font-medium text-slate-800 dark:text-slate-100 mb-1">
                    Aucun profil de permissions
                  </p>
                  <p className="mb-2 text-slate-500 dark:text-slate-400">
                    Créez ou importez un profil pour assigner rapidement des droits au membre
                    invité.
                  </p>
                  <PermissionGate permission="profiles.create">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <button
                        type="button"
                        onClick={() => setImportOpen(true)}
                        className="font-medium text-brand-600 dark:text-brand-400 hover:underline"
                      >
                        Importer depuis la librairie
                      </button>
                      <span className="text-slate-400" aria-hidden>
                        ou
                      </span>
                      <Link
                        href="/settings/profiles/new?returnTo=%2Fusers%2Fnew"
                        className="font-medium text-brand-600 dark:text-brand-400 hover:underline"
                      >
                        Créer un profil
                      </Link>
                    </div>
                  </PermissionGate>
                </div>
              )}
              {adminRoleSelected && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
                  Un administrateur d&apos;organisation possède automatiquement tous les droits.
                  Aucun profil ni permission personnalisée ne peut lui être affecté.
                </div>
              )}
            </FormDialogSection>

            <FormDialogSection title="Permissions">
              <div className={`${adminRoleSelected ? "opacity-60" : ""}`}>
                <div>
                  <div className="grid gap-1 sm:grid-cols-2">
                    {catalog.map((permission) => (
                      <label key={permission} className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          disabled={adminRoleSelected}
                          checked={selectedPermissions.includes(permission)}
                          onChange={() =>
                            setSelectedPermissions((previous) =>
                              togglePermission(previous, permission),
                            )
                          }
                        />
                        <span>
                          <span className="block text-slate-700 dark:text-slate-200">
                            {getPermissionLabel(permission)}
                          </span>
                          <span className="block font-mono text-xs text-slate-400 dark:text-slate-500">
                            {permission}
                          </span>
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </FormDialogSection>
          </>
        )}
      </FormPage>

      <ImportDefaultsDialog
        open={importOpen}
        onClose={() => setImportOpen(false)}
        title="Importer des profils"
        description="Choisissez des modèles prêts à l’emploi. Les profils déjà présents (même nom) sont ignorés."
        items={importItems}
        importing={importing}
        onImport={handleImport}
      />
    </>
  );
}
