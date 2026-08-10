"use client";

import Link from "next/link";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import type { TechnicianResponse, TeamResponse, TechnicianStatus } from "@planwise/shared";

const TECHNICIAN_STATUSES: TechnicianStatus[] = ["actif", "inactif"];
import * as fleetApi from "@/lib/fleet.api";
import * as adminApi from "@/lib/admin.api";
import type { ManagedOrganizationUser } from "@/lib/admin.api";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/ToastProvider";
import { usePermissions } from "@/lib/hooks/usePermissions";
import { useRouter } from "next/navigation";
import { DocumentUploadZone } from "@/components/documents/DocumentUploadZone";
import { AppErrorAlert, ResourceNotFoundPanel } from "@/components/ui/AppErrorAlert";
import { normalizeCalendarColorHex } from "@/lib/team-calendar-colors";
import { getOrganizationUserStatusLabel } from "@/lib/organization-user-status";

const STATUS_COLORS: Record<string, string> = {
  actif: "bg-emerald-50 text-emerald-700 border-emerald-200",
  inactif:
    "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700",
};

const STATUS_LABELS: Record<string, string> = {
  actif: "Actif",
  inactif: "Inactif",
};

const TEAM_STATUS_LABELS: Record<string, string> = {
  active: "Active",
  inactive: "Inactive",
};

export function TechnicianDetailsPage({ technicianId }: { technicianId: string }) {
  const router = useRouter();
  const { showToast } = useToast();
  const confirm = useConfirm();
  const { can } = usePermissions();
  const [technician, setTechnician] = useState<TechnicianResponse | null>(null);
  const [memberTeams, setMemberTeams] = useState<TeamResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const [editFirstName, setEditFirstName] = useState("");
  const [editLastName, setEditLastName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editSpeciality, setEditSpeciality] = useState("");
  const [editStatus, setEditStatus] = useState<TechnicianStatus>("actif");
  const [editCalendarColor, setEditCalendarColor] = useState("");

  const [accountAction, setAccountAction] = useState<"idle" | "invite" | "link">("idle");
  const [creatingAccount, setCreatingAccount] = useState(false);
  const [linkingAccount, setLinkingAccount] = useState(false);
  const [linkableUsers, setLinkableUsers] = useState<ManagedOrganizationUser[]>([]);
  const [loadingLinkableUsers, setLoadingLinkableUsers] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [techData, allTeams] = await Promise.all([
        fleetApi.getTechnician(technicianId),
        fleetApi.listTeams(),
      ]);
      setTechnician(techData);
      setMemberTeams(allTeams.filter((t) => t.technicianIds.includes(technicianId)));

      setEditFirstName(techData.firstName);
      setEditLastName(techData.lastName);
      setEditEmail(techData.email ?? "");
      setEditPhone(techData.phone ?? "");
      setEditSpeciality(techData.speciality ?? "");
      setEditStatus(techData.status);
      setEditCalendarColor(techData.calendarColor ?? "");
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [technicianId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const loadLinkableUsers = useCallback(async () => {
    if (!can("users.read")) return;
    setLoadingLinkableUsers(true);
    try {
      const [{ users }, technicians] = await Promise.all([
        adminApi.listOrganizationUsers(),
        fleetApi.listTechnicians(),
      ]);
      const linkedUserIds = new Set(
        technicians.map((tech) => tech.userId).filter((id): id is string => Boolean(id)),
      );
      setLinkableUsers(
        users.filter(
          (user) => user.organizationMembershipStatus !== "disabled" && !linkedUserIds.has(user.id),
        ),
      );
    } catch (err) {
      setError(err);
    } finally {
      setLoadingLinkableUsers(false);
    }
  }, [can]);

  useEffect(() => {
    if (accountAction === "link") {
      void loadLinkableUsers();
    }
  }, [accountAction, loadLinkableUsers]);

  const linkableUserOptions = useMemo(
    () =>
      linkableUsers.map((user) => ({
        id: user.id,
        label: `${user.name?.trim() || user.email} (${user.email}) — ${getOrganizationUserStatusLabel(user)}`,
      })),
    [linkableUsers],
  );
  const handleSave = async () => {
    if (!technician) return;
    setSaving(true);
    setError(null);
    try {
      await fleetApi.updateTechnician(technician.id, {
        firstName: editFirstName.trim(),
        lastName: editLastName.trim(),
        email: editEmail.trim() || undefined,
        phone: editPhone.trim() || undefined,
        speciality: editSpeciality.trim() || undefined,
        status: editStatus,
        calendarColor: editCalendarColor.trim() ? editCalendarColor.trim() : null,
      });
      showToast("Technicien mis à jour.");
      setIsEditing(false);
      await refresh();
    } catch (err) {
      setError(err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!technician) return;
    const ok = await confirm({
      title: "Supprimer ce technicien ?",
      description:
        "La fiche et les informations de ce profil seront supprimées définitivement. Cette action ne peut pas être annulée.",
      confirmLabel: "Supprimer",
      variant: "danger",
    });
    if (!ok) return;
    try {
      await fleetApi.deleteTechnician(technician.id);
      showToast("Technicien supprimé.");
      router.push("/fleet/technicians");
    } catch (err) {
      setError(err);
    }
  };

  const handleCreateAccount = async () => {
    if (!technician) return;
    if (!technician.email?.trim()) {
      setError("Une adresse email est requise pour envoyer l'invitation");
      return;
    }
    setCreatingAccount(true);
    setError(null);
    try {
      const result = await fleetApi.createTechnicianUserAccount(technician.id);
      showToast(
        result.emailSent
          ? "Invitation envoyée par e-mail."
          : "Invitation créée, mais l'e-mail n'a pas pu être envoyé. Vous pourrez le renvoyer depuis la liste des utilisateurs.",
        result.emailSent ? undefined : "error",
      );
      setAccountAction("idle");
      await refresh();
    } catch (err) {
      setError(err);
    } finally {
      setCreatingAccount(false);
    }
  };

  const handleLinkAccount = async () => {
    if (!technician) return;
    if (!selectedUserId) {
      setError("Sélectionnez un utilisateur à lier");
      return;
    }
    setLinkingAccount(true);
    setError(null);
    try {
      await fleetApi.linkTechnicianUser(technician.id, selectedUserId);
      showToast("Compte utilisateur lié au technicien.");
      setAccountAction("idle");
      setSelectedUserId("");
      await refresh();
    } catch (err) {
      setError(err);
    } finally {
      setLinkingAccount(false);
    }
  };

  if (loading) {
    return (
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 text-sm text-slate-500 dark:text-slate-400">
        Chargement...
      </div>
    );
  }

  if (!technician) {
    return (
      <ResourceNotFoundPanel
        error={error}
        resourceLabel="Technicien"
        backHref="/fleet/technicians"
        backLabel="Retour à la liste"
        onRetry={() => void refresh()}
      />
    );
  }

  const linkedMembership = technician.linkedUser?.organizationMembershipStatus;
  const technicianUserInvitationPending = Boolean(
    technician.userId &&
    technician.linkedUser &&
    (linkedMembership === "invited" || technician.linkedUser.status === "invited"),
  );
  const technicianUserDisabled = Boolean(
    technician.userId && technician.linkedUser && linkedMembership === "disabled",
  );
  const technicianUserAccountActive = Boolean(
    technician.userId &&
    technician.linkedUser &&
    !technicianUserInvitationPending &&
    !technicianUserDisabled &&
    (linkedMembership === "active" ||
      (!linkedMembership && technician.linkedUser.status === "active")),
  );
  const technicianUserLinkedUnknown = Boolean(technician.userId && !technician.linkedUser);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold mb-1">
            {technician.firstName} {technician.lastName}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Fiche technicien
            {technician.speciality ? ` — ${technician.speciality}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {can("fleet.technicians.update") && (
            <button
              type="button"
              onClick={() => setIsEditing((p) => !p)}
              className="rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              {isEditing ? "Annuler" : "Modifier"}
            </button>
          )}
          {can("fleet.technicians.delete") && (
            <button
              type="button"
              onClick={() => void handleDelete()}
              className="rounded-lg border border-red-300 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50"
            >
              Supprimer
            </button>
          )}
          <Link
            href="/fleet/technicians"
            className="rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            Retour
          </Link>
        </div>
      </div>

      {error ? <AppErrorAlert error={error} onRetry={() => void refresh()} /> : null}

      {!isEditing ? (
        <section className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4">
          <h2 className="font-semibold mb-3">Informations</h2>
          <div className="grid gap-3 md:grid-cols-2 text-sm">
            <div>
              <span className="text-slate-400 dark:text-slate-500">Prénom</span>
              <p>{technician.firstName}</p>
            </div>
            <div>
              <span className="text-slate-400 dark:text-slate-500">Nom</span>
              <p>{technician.lastName}</p>
            </div>
            <div>
              <span className="text-slate-400 dark:text-slate-500">Email</span>
              <p>{technician.email || "—"}</p>
            </div>
            <div>
              <span className="text-slate-400 dark:text-slate-500">Téléphone</span>
              <p>{technician.phone || "—"}</p>
            </div>
            <div>
              <span className="text-slate-400 dark:text-slate-500">Spécialité</span>
              <p>{technician.speciality || "—"}</p>
            </div>
            <div>
              <span className="text-slate-400 dark:text-slate-500">Statut</span>
              <p>
                <span
                  className={`inline-flex rounded border px-2 py-0.5 text-xs ${STATUS_COLORS[technician.status] ?? "bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700"}`}
                >
                  {STATUS_LABELS[technician.status] ?? technician.status}
                </span>
              </p>
            </div>
            <div className="md:col-span-2">
              <span className="text-slate-400 dark:text-slate-500">Couleur au calendrier</span>
              <div className="mt-1 flex items-center gap-2 flex-wrap">
                {technician.calendarColor && normalizeCalendarColorHex(technician.calendarColor) ? (
                  <>
                    <span
                      className="h-6 w-10 rounded border shrink-0"
                      style={{
                        backgroundColor:
                          normalizeCalendarColorHex(technician.calendarColor) ?? undefined,
                      }}
                    />
                    <code className="text-xs text-slate-600 dark:text-slate-300">
                      {normalizeCalendarColorHex(technician.calendarColor)}
                    </code>
                  </>
                ) : (
                  <p className="text-sm text-slate-600 dark:text-slate-300">
                    Automatique (couleur dérivée de la personne sur le calendrier)
                  </p>
                )}
              </div>
            </div>
          </div>
        </section>
      ) : (
        <section className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 space-y-4">
          <h2 className="font-semibold">Modifier le technicien</h2>
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="block text-sm text-slate-500 dark:text-slate-400 mb-1">
                Prénom
              </label>
              <input
                type="text"
                value={editFirstName}
                onChange={(e) => setEditFirstName(e.target.value)}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-slate-900 dark:text-slate-100"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-500 dark:text-slate-400 mb-1">Nom</label>
              <input
                type="text"
                value={editLastName}
                onChange={(e) => setEditLastName(e.target.value)}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-slate-900 dark:text-slate-100"
              />
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="block text-sm text-slate-500 dark:text-slate-400 mb-1">Email</label>
              <input
                type="email"
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-slate-900 dark:text-slate-100"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-500 dark:text-slate-400 mb-1">
                Téléphone
              </label>
              <input
                type="tel"
                value={editPhone}
                onChange={(e) => setEditPhone(e.target.value)}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-slate-900 dark:text-slate-100"
              />
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="block text-sm text-slate-500 dark:text-slate-400 mb-1">
                Spécialité
              </label>
              <input
                type="text"
                value={editSpeciality}
                onChange={(e) => setEditSpeciality(e.target.value)}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-slate-900 dark:text-slate-100"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-500 dark:text-slate-400 mb-1">
                Statut
              </label>
              <select
                value={editStatus}
                onChange={(e) => setEditStatus(e.target.value as TechnicianStatus)}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-slate-900 dark:text-slate-100"
              >
                {TECHNICIAN_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s === "actif" ? "Actif" : "Inactif"}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950/50 p-3 space-y-2">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
              Couleur au calendrier
            </label>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Utilisée pour les interventions assignées à cette personne. Laissez vide pour une
              couleur automatique.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <input
                type="color"
                aria-label="Choix de la couleur"
                className="h-10 w-14 cursor-pointer rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900"
                value={normalizeCalendarColorHex(editCalendarColor) ?? "#94a3b8"}
                onChange={(e) => setEditCalendarColor(e.target.value)}
              />
              <input
                type="text"
                placeholder="#RRGGBB"
                value={editCalendarColor}
                onChange={(e) => setEditCalendarColor(e.target.value)}
                className="flex-1 min-w-[120px] rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm font-mono text-slate-900 dark:text-slate-100"
              />
              <button
                type="button"
                onClick={() => setEditCalendarColor("")}
                className="rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Automatique
              </button>
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
        </section>
      )}

      <section className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 space-y-3">
        <h2 className="font-semibold">Équipes</h2>
        {memberTeams.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Ce technicien n&apos;est membre d&apos;aucune équipe.
          </p>
        ) : (
          <div className="space-y-2">
            {memberTeams.map((team) => (
              <Link
                key={team.id}
                href={`/fleet/teams/${team.id}`}
                className="flex items-center justify-between rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 p-3 text-sm hover:bg-slate-100 dark:bg-slate-800 transition"
              >
                <div>
                  <span className="font-medium text-brand-600 dark:text-brand-400">
                    {team.name}
                  </span>
                  {team.agenceName && (
                    <span className="ml-2 text-slate-500 dark:text-slate-400">
                      ({team.agenceName})
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400 dark:text-slate-500">
                    {team.technicianIds.length} membre{team.technicianIds.length !== 1 ? "s" : ""}
                  </span>
                  <span className="text-xs text-slate-400 dark:text-slate-500">
                    {TEAM_STATUS_LABELS[team.status] ?? team.status}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 space-y-3">
        <h2 className="font-semibold">Compte utilisateur</h2>
        {technicianUserAccountActive ? (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
            Compte utilisateur actif
            {technician.linkedUser?.email ? (
              <>
                {" "}
                (<span className="font-medium">{technician.linkedUser.email}</span>)
              </>
            ) : null}
            .
          </div>
        ) : technicianUserInvitationPending ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 space-y-1">
            <p className="font-medium">Invitation en attente</p>
            <p>
              Un e-mail d&apos;invitation a été envoyé
              {technician.linkedUser?.email || technician.email
                ? ` à ${technician.linkedUser?.email ?? technician.email}`
                : ""}
              . Le compte sera actif lorsque l&apos;utilisateur aura défini son mot de passe.
            </p>
            {can("users.read") ? (
              <p>
                <Link href="/users" className="underline hover:no-underline">
                  Suivre l&apos;invitation dans Utilisateurs
                </Link>
              </p>
            ) : null}
          </div>
        ) : technicianUserDisabled ? (
          <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 p-3 text-sm text-slate-600 dark:text-slate-300">
            Le compte utilisateur lié est désactivé
            {technician.linkedUser?.email ? (
              <>
                {" "}
                (<span className="font-medium">{technician.linkedUser.email}</span>)
              </>
            ) : null}
            .
          </div>
        ) : technicianUserLinkedUnknown ? (
          <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 p-3 text-sm text-slate-600 dark:text-slate-300">
            Compte utilisateur lié (détails indisponibles pour le moment).
          </div>
        ) : (
          <>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Ce technicien n&apos;a pas encore de compte utilisateur.
            </p>
            {accountAction === "idle" ? (
              can("fleet.technicians.create_user") ? (
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setAccountAction("invite")}
                    className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-500"
                  >
                    Inviter un utilisateur
                  </button>
                  <button
                    type="button"
                    onClick={() => setAccountAction("link")}
                    className="rounded-lg border border-slate-200 dark:border-slate-700 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
                  >
                    Lier un compte existant
                  </button>
                </div>
              ) : null
            ) : accountAction === "invite" ? (
              <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 p-4 space-y-3">
                <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                  Inviter {technician.firstName} {technician.lastName}
                </p>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Une invitation sera envoyée par e-mail. Le technicien définira son mot de passe en
                  activant le compte.
                </p>
                {!technician.email && (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
                    Ce technicien n&apos;a pas d&apos;adresse email. Veuillez d&apos;abord modifier
                    sa fiche pour ajouter un email.
                  </div>
                )}
                <div>
                  <label className="block text-sm text-slate-500 dark:text-slate-400 mb-1">
                    Email d&apos;invitation
                  </label>
                  <input
                    type="email"
                    value={technician.email ?? ""}
                    disabled
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-slate-500 dark:text-slate-400"
                  />
                </div>
                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setAccountAction("idle")}
                    className="rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
                  >
                    Annuler
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleCreateAccount()}
                    disabled={creatingAccount || !technician.email}
                    className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-500 disabled:opacity-50"
                  >
                    {creatingAccount ? "Envoi..." : "Envoyer l'invitation"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 p-4 space-y-3">
                <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                  Lier un compte existant
                </p>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Associez ce technicien à un utilisateur déjà présent dans l&apos;organisation.
                </p>
                {!can("users.read") ? (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
                    Vous n&apos;avez pas le droit de consulter la liste des utilisateurs. Demandez à
                    un administrateur de lier le compte, ou invitez un nouvel utilisateur.
                  </div>
                ) : loadingLinkableUsers ? (
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Chargement des utilisateurs…
                  </p>
                ) : linkableUserOptions.length === 0 ? (
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Aucun utilisateur disponible à lier (déjà associés à un technicien, ou
                    désactivés).
                  </p>
                ) : (
                  <div>
                    <label
                      htmlFor="link-user-select"
                      className="block text-sm text-slate-500 dark:text-slate-400 mb-1"
                    >
                      Utilisateur
                    </label>
                    <select
                      id="link-user-select"
                      value={selectedUserId}
                      onChange={(e) => setSelectedUserId(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100"
                    >
                      <option value="">Sélectionner…</option>
                      {linkableUserOptions.map((option) => (
                        <option key={option.id} value={option.id}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setAccountAction("idle");
                      setSelectedUserId("");
                    }}
                    className="rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
                  >
                    Annuler
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleLinkAccount()}
                    disabled={
                      linkingAccount ||
                      !selectedUserId ||
                      !can("users.read") ||
                      linkableUserOptions.length === 0
                    }
                    className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-500 disabled:opacity-50"
                  >
                    {linkingAccount ? "Liaison..." : "Lier le compte"}
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </section>

      <DocumentUploadZone entityType="technician" entityId={technicianId} />
    </div>
  );
}
