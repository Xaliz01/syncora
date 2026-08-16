"use client";

import Link from "next/link";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { PermissionCode, PermissionProfileResponse } from "@planwise/shared";
import * as adminApi from "@/lib/admin.api";
import * as fleetApi from "@/lib/fleet.api";
import { getPermissionLabel } from "@/lib/permissions-catalog";
import type { ManagedOrganizationUser } from "@/lib/admin.api";
import { useToast } from "@/components/ui/ToastProvider";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { usePermissions } from "@/lib/hooks/usePermissions";
import { useAuth } from "@/components/auth/AuthContext";
import { getOrganizationUserStatusLabel } from "@/lib/organization-user-status";
import { PermissionGate } from "@/components/auth/PermissionGate";
import { hasPermission } from "@/lib/auth-permissions";
import { ResourceNotFoundPanel } from "@/components/ui/AppErrorAlert";
import { PlanwiseLoader } from "@/components/ui/PlanwiseLoader";

const ROLE_LABELS: Record<string, string> = {
  admin: "Administrateur",
  member: "Membre",
};

function splitDisplayName(
  name: string | undefined,
  email: string,
): { firstName: string; lastName: string } {
  const trimmed = name?.trim() || "";
  if (!trimmed) {
    const local = email.split("@")[0] || "Technicien";
    return { firstName: local, lastName: "" };
  }
  const parts = trimmed.split(/\s+/);
  if (parts.length === 1) return { firstName: parts[0], lastName: "" };
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
}

function togglePermission(list: PermissionCode[], permission: PermissionCode): PermissionCode[] {
  if (list.includes(permission)) return list.filter((item) => item !== permission);
  return [...list, permission];
}

export function UserDetailsPage({ userId }: { userId: string }) {
  const { showToast } = useToast();
  const confirm = useConfirm();
  const { user: currentUser } = useAuth();
  const { can } = usePermissions();
  const queryClient = useQueryClient();
  const [catalog, setCatalog] = useState<PermissionCode[]>([]);
  const [profiles, setProfiles] = useState<PermissionProfileResponse[]>([]);
  const [user, setUser] = useState<ManagedOrganizationUser | null>(null);
  const [profileId, setProfileId] = useState("");
  const [selectedPermissions, setSelectedPermissions] = useState<PermissionCode[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [membershipActionLoading, setMembershipActionLoading] = useState(false);
  const [creatingTechnician, setCreatingTechnician] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isOrganizationAdmin = user?.role === "admin";
  const isSelf = user?.id === currentUser?.id;
  const isDisabled = user?.organizationMembershipStatus === "disabled";
  const isInvited = user?.organizationMembershipStatus === "invited";
  const canReadTechnicians =
    hasPermission(currentUser, "fleet.technicians.read") ||
    hasPermission(currentUser, "technicians.read");
  const canCreateTechnician =
    hasPermission(currentUser, "fleet.technicians.create") ||
    hasPermission(currentUser, "technicians.create");
  const canLinkTechnician =
    hasPermission(currentUser, "fleet.technicians.update") ||
    hasPermission(currentUser, "technicians.update");

  const { data: technicians = [] } = useQuery({
    queryKey: ["fleet-technicians"],
    queryFn: () => fleetApi.listTechnicians(),
    enabled: canReadTechnicians,
  });

  const linkedTechnician = useMemo(
    () => technicians.find((technician) => technician.userId === userId) ?? null,
    [technicians, userId],
  );

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [catalogRes, profilesRes, userRes] = await Promise.all([
        adminApi.getPermissionsCatalog(),
        adminApi.listPermissionProfiles(),
        adminApi.getOrganizationUser(userId),
      ]);
      const currentUser = userRes.user;
      setCatalog(catalogRes.availablePermissions);
      setProfiles(profilesRes);
      setUser(currentUser);
      setProfileId(currentUser.permissionAssignment.profileId ?? "");
      setSelectedPermissions(currentUser.permissions);
      setIsEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur de chargement de la fiche utilisateur");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const selectedProfileName = useMemo(() => {
    if (!profileId) return "Aucun profil";
    return profiles.find((profile) => profile.id === profileId)?.name ?? "Profil inconnu";
  }, [profileId, profiles]);

  const handleSave = async () => {
    if (!user || isOrganizationAdmin) return;
    setSaving(true);
    setError(null);
    const profilePermissions =
      profiles.find((profile) => profile.id === profileId)?.permissions ?? [];
    try {
      await adminApi.updateOrganizationUserPermissions(user.id, {
        profileId: profileId || null,
        extraPermissions: selectedPermissions.filter(
          (permission) => !profilePermissions.includes(permission),
        ),
        revokedPermissions: profilePermissions.filter(
          (permission) => !selectedPermissions.includes(permission),
        ),
      });
      showToast("Droits utilisateur mis à jour.");
      setIsEditing(false);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible de sauvegarder les droits");
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async () => {
    if (!user || isSelf) return;
    const confirmed = await confirm({
      title: "Désactiver cet utilisateur ?",
      description: (
        <>
          <strong>{user.name ?? user.email}</strong> ne pourra plus accéder à l&apos;organisation.
          Le créneau sera libéré.
        </>
      ),
      confirmLabel: "Désactiver",
      variant: "danger",
    });
    if (!confirmed) return;
    setMembershipActionLoading(true);
    try {
      await adminApi.deactivateOrganizationUser(user.id);
      showToast("Utilisateur désactivé.", "success");
      await refresh();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Désactivation impossible", "error");
    } finally {
      setMembershipActionLoading(false);
    }
  };

  const handleReactivate = async () => {
    if (!user) return;
    const confirmed = await confirm({
      title: "Réactiver cet utilisateur ?",
      description: (
        <>
          <strong>{user.name ?? user.email}</strong> retrouvera l&apos;accès si un créneau est
          disponible.
        </>
      ),
      confirmLabel: "Réactiver",
    });
    if (!confirmed) return;
    setMembershipActionLoading(true);
    try {
      await adminApi.reactivateOrganizationUser(user.id);
      showToast("Utilisateur réactivé.", "success");
      await refresh();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Réactivation impossible", "error");
    } finally {
      setMembershipActionLoading(false);
    }
  };

  const handleCreateLinkedTechnician = async () => {
    if (!user || linkedTechnician || !canCreateTechnician || !canLinkTechnician) return;
    const confirmed = await confirm({
      title: "Créer un technicien associé ?",
      description: (
        <>
          Un technicien sera créé pour <strong>{user.name ?? user.email}</strong> et lié à ce
          compte. Il pourra ensuite être affecté sur des interventions.
        </>
      ),
      confirmLabel: "Créer le technicien",
    });
    if (!confirmed) return;

    setCreatingTechnician(true);
    try {
      const { firstName, lastName } = splitDisplayName(user.name, user.email);
      const created = await fleetApi.createTechnician({
        firstName,
        lastName: lastName || firstName,
        email: user.email,
        status: "actif",
      });
      await fleetApi.linkTechnicianUser(created.id, user.id);
      showToast("Technicien créé et associé à l’utilisateur.", "success");
      await queryClient.invalidateQueries({ queryKey: ["fleet-technicians"] });
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Impossible de créer le technicien associé",
        "error",
      );
    } finally {
      setCreatingTechnician(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <PlanwiseLoader size="md" label="Chargement…" />
      </div>
    );
  }

  if (!user) {
    return (
      <ResourceNotFoundPanel
        resourceLabel="Utilisateur"
        backHref="/users"
        backLabel="Retour à la liste"
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold mb-1">Fiche utilisateur</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Détail de{" "}
            <span className="font-medium text-slate-700 dark:text-slate-200">{user.email}</span>.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {!isSelf && !isInvited ? (
            <PermissionGate permission="users.deactivate">
              {isDisabled ? (
                <button
                  type="button"
                  onClick={() => void handleReactivate()}
                  disabled={membershipActionLoading}
                  className="rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-sm text-brand-600 dark:text-brand-400 hover:bg-brand-50 dark:hover:bg-brand-950/40 disabled:opacity-50"
                >
                  {membershipActionLoading ? "Réactivation…" : "Réactiver"}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => void handleDeactivate()}
                  disabled={membershipActionLoading}
                  className="rounded-lg border border-red-200 dark:border-red-900 px-3 py-1.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 disabled:opacity-50"
                >
                  {membershipActionLoading ? "Désactivation…" : "Désactiver"}
                </button>
              )}
            </PermissionGate>
          ) : null}
          {!isOrganizationAdmin && !isDisabled && can("users.manage_permissions") && (
            <button
              type="button"
              onClick={() => setIsEditing((previous) => !previous)}
              className="rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              {isEditing ? "Annuler" : "Modifier"}
            </button>
          )}
          <Link
            href="/users"
            className="rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            Retour à la liste
          </Link>
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm p-3">
          {error}
        </div>
      )}

      <section className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4">
        <div className="grid gap-2 md:grid-cols-2 text-sm">
          <div>
            <span className="text-slate-400 dark:text-slate-500">Nom</span>
            <p>{user.name ?? "—"}</p>
          </div>
          <div>
            <span className="text-slate-400 dark:text-slate-500">Email</span>
            <p>{user.email}</p>
          </div>
          <div>
            <span className="text-slate-400 dark:text-slate-500">Rôle</span>
            <p>{ROLE_LABELS[user.role] ?? user.role}</p>
          </div>
          <div>
            <span className="text-slate-400 dark:text-slate-500">Statut</span>
            <p>{getOrganizationUserStatusLabel(user)}</p>
          </div>
        </div>
      </section>

      {canReadTechnicians && (
        <section className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
            <div>
              <h2 className="font-semibold">Technicien associé</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                Nécessaire pour affecter cet utilisateur sur des interventions. Sans technicien lié,
                seules les permissions applicatives s&apos;appliquent.
              </p>
            </div>
            {linkedTechnician ? (
              <Link
                href={`/fleet/technicians/${linkedTechnician.id}`}
                className="rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-sm text-brand-600 dark:text-brand-400 hover:bg-brand-50 dark:hover:bg-brand-950/40 self-start"
              >
                Voir la fiche technicien
              </Link>
            ) : canCreateTechnician && canLinkTechnician && !isDisabled ? (
              <button
                type="button"
                onClick={() => void handleCreateLinkedTechnician()}
                disabled={creatingTechnician}
                className="rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-500 disabled:opacity-50 self-start"
              >
                {creatingTechnician ? "Création…" : "Créer un technicien associé"}
              </button>
            ) : null}
          </div>
          {linkedTechnician ? (
            <p className="text-sm text-slate-700 dark:text-slate-200">
              {linkedTechnician.firstName} {linkedTechnician.lastName}
              {linkedTechnician.speciality ? ` · ${linkedTechnician.speciality}` : ""}
            </p>
          ) : (
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Aucun technicien n&apos;est lié à cet utilisateur.
            </p>
          )}
        </section>
      )}

      <section className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4">
        <h2 className="font-semibold mb-2">Permissions actuelles</h2>
        <div className="flex flex-wrap gap-2">
          {user.permissions.map((permission) => (
            <div
              key={permission}
              className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-1 text-xs"
            >
              <div className="text-slate-800 dark:text-slate-100">
                {getPermissionLabel(permission)}
              </div>
              <div className="text-slate-500 dark:text-slate-400 font-mono">{permission}</div>
            </div>
          ))}
        </div>
      </section>

      {isOrganizationAdmin ? (
        <section className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
          Cet utilisateur est administrateur d’organisation : ses droits sont complets et ne peuvent
          pas être modifiés.
        </section>
      ) : (
        <section className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 space-y-4">
          <h2 className="font-semibold">Affectation</h2>

          {!isEditing ? (
            <div className="space-y-3 text-sm">
              <div>
                <span className="text-slate-400 dark:text-slate-500">Profil</span>
                <p className="text-slate-700 dark:text-slate-200">{selectedProfileName}</p>
              </div>
              <div>
                <span className="text-slate-400 dark:text-slate-500">Permissions ciblées</span>
                <div className="mt-2 grid gap-2 md:grid-cols-2">
                  {selectedPermissions.map((permission) => (
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
                  {selectedPermissions.length === 0 && (
                    <p className="text-slate-500 dark:text-slate-400">Aucune permission ciblée.</p>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <>
              <div>
                <label className="block text-sm text-slate-500 dark:text-slate-400 mb-1">
                  Profil affecté
                </label>
                <select
                  value={profileId}
                  onChange={(e) => {
                    const nextProfileId = e.target.value;
                    setProfileId(nextProfileId);
                    const profilePermissions =
                      profiles.find((profile) => profile.id === nextProfileId)?.permissions ?? [];
                    setSelectedPermissions(profilePermissions);
                  }}
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-slate-900 dark:text-slate-100"
                >
                  <option value="">Aucun profil</option>
                  {profiles.map((profile) => (
                    <option key={profile.id} value={profile.id}>
                      {profile.name}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
                  Profil sélectionné : {selectedProfileName}
                </p>
              </div>

              <div>
                <p className="text-sm font-medium text-slate-700 dark:text-slate-200 mb-2">
                  Permissions
                </p>
                <div className="grid gap-2 md:grid-cols-2">
                  {catalog.map((permission) => (
                    <label key={permission} className="flex items-start gap-2 text-sm">
                      <input
                        type="checkbox"
                        className="mt-1"
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
                        <span className="block text-xs text-slate-400 dark:text-slate-500 font-mono">
                          {permission}
                        </span>
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => void handleSave()}
                  disabled={saving}
                  className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-500 disabled:opacity-50"
                >
                  {saving ? "Enregistrement..." : "Enregistrer"}
                </button>
              </div>
            </>
          )}
        </section>
      )}
    </div>
  );
}
