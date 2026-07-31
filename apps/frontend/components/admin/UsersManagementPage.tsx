"use client";

import Link from "next/link";
import React, { useCallback, useEffect, useState } from "react";
import type { InvitationResponse } from "@planwise/shared";
import * as adminApi from "@/lib/admin.api";
import * as subscriptionsApi from "@/lib/subscriptions.api";
import type { ManagedOrganizationUser } from "@/lib/admin.api";
import { getOrganizationUserStatusLabel } from "@/lib/organization-user-status";
import { PermissionGate } from "@/components/auth/PermissionGate";
import { ExportButton } from "@/components/ui/ExportButton";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/ToastProvider";
import * as exportsApi from "@/lib/exports.api";

const ROLE_LABELS: Record<string, string> = {
  admin: "Administrateur",
  member: "Membre",
};

const INVITATION_STATUS_LABELS: Record<string, string> = {
  pending: "En attente",
  accepted: "Acceptée",
  cancelled: "Annulée",
  expired: "Expirée",
  revoked: "Révoquée",
};

export function UsersManagementPage() {
  const { showToast } = useToast();
  const confirm = useConfirm();
  const [users, setUsers] = useState<ManagedOrganizationUser[]>([]);
  const [invitations, setInvitations] = useState<InvitationResponse[]>([]);
  const [maxUsers, setMaxUsers] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editEmail, setEditEmail] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [usersRes, invitationsRes, subscriptionRes] = await Promise.all([
        adminApi.listOrganizationUsers(),
        adminApi.listInvitations(),
        subscriptionsApi.getSubscriptionCurrent().catch(() => null),
      ]);
      setUsers(usersRes.users);
      setInvitations(invitationsRes.filter((invitation) => invitation.status !== "cancelled"));
      setMaxUsers(subscriptionRes?.hasAccess ? subscriptionRes.maxUsers : null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur de chargement des utilisateurs");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const handleResendInvitation = async (invitationId: string) => {
    setResendingId(invitationId);
    try {
      const result = await adminApi.resendInvitation(invitationId);
      showToast(
        result.emailSent
          ? "E-mail d'invitation renvoyé."
          : "Impossible d'envoyer l'e-mail pour le moment.",
        result.emailSent ? "success" : "error",
      );
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Renvoi impossible", "error");
    } finally {
      setResendingId(null);
    }
  };

  const startEditEmail = (invitation: InvitationResponse) => {
    setEditingId(invitation.id);
    setEditEmail(invitation.invitedEmail);
  };

  const cancelEditEmail = () => {
    setEditingId(null);
    setEditEmail("");
  };

  const handleSaveEmail = async (invitationId: string) => {
    const email = editEmail.trim();
    if (!email || !email.includes("@")) {
      showToast("Adresse e-mail invalide", "error");
      return;
    }
    setSavingId(invitationId);
    try {
      const result = await adminApi.updatePendingInvitation(invitationId, email);
      setInvitations((prev) =>
        prev.map((invitation) => (invitation.id === invitationId ? result.invitation : invitation)),
      );
      setEditingId(null);
      setEditEmail("");
      showToast(
        result.emailSent
          ? "E-mail mis à jour et invitation renvoyée."
          : "E-mail mis à jour, mais l'envoi a échoué.",
        result.emailSent ? "success" : "error",
      );
      await loadData();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Modification impossible", "error");
    } finally {
      setSavingId(null);
    }
  };

  const handleDeleteInvitation = async (invitation: InvitationResponse) => {
    const confirmed = await confirm({
      title: "Supprimer cette invitation ?",
      description: (
        <>
          L&apos;invitation pour <strong>{invitation.invitedEmail}</strong> sera annulée et le
          créneau utilisateur sera libéré.
        </>
      ),
      confirmLabel: "Supprimer",
      variant: "danger",
    });
    if (!confirmed) return;

    setDeletingId(invitation.id);
    try {
      await adminApi.cancelInvitation(invitation.id);
      showToast("Invitation supprimée.", "success");
      await loadData();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Suppression impossible", "error");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold">Utilisateurs</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Liste des utilisateurs de l&apos;organisation. Cliquez sur un nom pour ouvrir sa fiche.
            {maxUsers !== null && (
              <span className="block mt-1 text-slate-600 dark:text-slate-300">
                {users.length} / {maxUsers} utilisateur{maxUsers > 1 ? "s" : ""} utilisés.
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2 self-start flex-shrink-0">
          <PermissionGate permission="exports.users">
            <ExportButton onExport={(format) => exportsApi.exportUsersList(format)} />
          </PermissionGate>
          <PermissionGate permission="users.invite">
            <Link
              href="/users/new"
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-500 transition"
            >
              Inviter un utilisateur
            </Link>
          </PermissionGate>
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm p-3">
          {error}
        </div>
      )}

      {loading ? (
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 text-sm text-slate-500 dark:text-slate-400">
          Chargement...
        </div>
      ) : users.length === 0 ? (
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 text-sm text-slate-500 dark:text-slate-400">
          Aucun utilisateur.
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 overflow-hidden">
          <div className="hidden md:grid md:grid-cols-[1.2fr_1.2fr_auto_auto] gap-3 border-b border-slate-200 dark:border-slate-700 px-4 py-3 text-xs uppercase tracking-wide text-slate-400 dark:text-slate-500">
            <span>Utilisateur</span>
            <span>Email</span>
            <span>Rôle</span>
            <span>Statut</span>
          </div>
          {users.map((user) => (
            <div
              key={user.id}
              className="grid md:grid-cols-[1.2fr_1.2fr_auto_auto] gap-2 md:gap-3 items-center px-4 py-3 border-b border-slate-200 dark:border-slate-700 last:border-b-0"
            >
              <Link
                href={`/users/${user.id}`}
                className="font-medium text-brand-600 dark:text-brand-400 hover:text-brand-500 hover:underline"
              >
                {user.name ?? user.email}
              </Link>
              <div className="text-sm text-slate-500 dark:text-slate-400 truncate">
                {user.email}
              </div>
              <span className="inline-flex w-fit rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2 py-0.5 text-xs text-slate-700 dark:text-slate-200">
                {ROLE_LABELS[user.role] ?? user.role}
              </span>
              <span className="inline-flex w-fit rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2 py-0.5 text-xs text-slate-700 dark:text-slate-200">
                {getOrganizationUserStatusLabel(user)}
              </span>
            </div>
          ))}
        </div>
      )}

      {!loading && (
        <section className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4">
          <h2 className="font-semibold mb-3">Suivi des invitations</h2>
          {invitations.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">Aucune invitation.</p>
          ) : (
            <div className="space-y-2">
              {invitations.map((invitation) => (
                <article
                  key={invitation.id}
                  className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 p-3 text-sm"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="flex flex-col gap-2 min-w-0 flex-1">
                      {editingId === invitation.id ? (
                        <div className="flex flex-wrap items-center gap-2">
                          <label className="sr-only" htmlFor={`invite-email-${invitation.id}`}>
                            Nouvel e-mail
                          </label>
                          <input
                            id={`invite-email-${invitation.id}`}
                            type="email"
                            value={editEmail}
                            onChange={(e) => setEditEmail(e.target.value)}
                            className="min-w-[14rem] flex-1 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-1.5 text-sm"
                          />
                          <button
                            type="button"
                            onClick={() => void handleSaveEmail(invitation.id)}
                            disabled={savingId === invitation.id}
                            className="rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-500 disabled:opacity-50 transition"
                          >
                            {savingId === invitation.id ? "Enregistrement…" : "Enregistrer"}
                          </button>
                          <button
                            type="button"
                            onClick={cancelEditEmail}
                            disabled={savingId === invitation.id}
                            className="rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50 transition"
                          >
                            Annuler
                          </button>
                        </div>
                      ) : (
                        <div className="flex flex-wrap items-center gap-2 min-w-0">
                          <span className="font-medium truncate">{invitation.invitedEmail}</span>
                          <span className="rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-0.5 text-xs text-slate-600 dark:text-slate-300">
                            {INVITATION_STATUS_LABELS[invitation.status] ?? invitation.status}
                          </span>
                        </div>
                      )}
                    </div>
                    {invitation.status === "pending" && editingId !== invitation.id && (
                      <PermissionGate permission="users.invite">
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => startEditEmail(invitation)}
                            className="rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                          >
                            Modifier l&apos;e-mail
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleResendInvitation(invitation.id)}
                            disabled={resendingId === invitation.id}
                            className="rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs font-medium text-brand-600 dark:text-brand-400 hover:bg-brand-50 dark:hover:bg-brand-950/40 disabled:opacity-50 transition"
                          >
                            {resendingId === invitation.id ? "Envoi…" : "Renvoyer l'e-mail"}
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleDeleteInvitation(invitation)}
                            disabled={deletingId === invitation.id}
                            className="rounded-lg border border-red-200 dark:border-red-900 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 disabled:opacity-50 transition"
                          >
                            {deletingId === invitation.id ? "Suppression…" : "Supprimer"}
                          </button>
                        </div>
                      </PermissionGate>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
