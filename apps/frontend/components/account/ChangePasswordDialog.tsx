"use client";

import React, { useCallback, useEffect, useState } from "react";
import * as accountApi from "@/lib/account.api";
import { useToast } from "@/components/ui/ToastProvider";

const inputClassName =
  "w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 transition";

export function ChangePasswordDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { showToast } = useToast();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);

  const resetForm = useCallback(() => {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
  }, []);

  useEffect(() => {
    if (!open) resetForm();
  }, [open, resetForm]);

  const handleClose = useCallback(() => {
    if (saving) return;
    resetForm();
    onClose();
  }, [onClose, resetForm, saving]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!currentPassword || !newPassword) return;
      if (newPassword !== confirmPassword) {
        showToast("Les mots de passe ne correspondent pas", "error");
        return;
      }
      if (newPassword.length < 6) {
        showToast("Le mot de passe doit contenir au moins 6 caractères", "error");
        return;
      }
      setSaving(true);
      try {
        await accountApi.changePassword({ currentPassword, newPassword });
        showToast("Mot de passe mis à jour");
        handleClose();
      } catch (err) {
        showToast((err as Error).message, "error");
      } finally {
        setSaving(false);
      }
    },
    [currentPassword, newPassword, confirmPassword, handleClose, showToast],
  );

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-slate-950/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="change-password-title"
      onClick={handleClose}
    >
      <div
        className="w-full max-w-md rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xl p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <h2
          id="change-password-title"
          className="text-lg font-semibold text-slate-900 dark:text-slate-100"
        >
          Modifier mon mot de passe
        </h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Saisissez votre mot de passe actuel puis choisissez un nouveau mot de passe.
        </p>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label
              htmlFor="dialog-current-password"
              className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1"
            >
              Mot de passe actuel
            </label>
            <input
              id="dialog-current-password"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className={inputClassName}
              autoComplete="current-password"
              disabled={saving}
              autoFocus
            />
          </div>
          <div>
            <label
              htmlFor="dialog-new-password"
              className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1"
            >
              Nouveau mot de passe
            </label>
            <input
              id="dialog-new-password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className={inputClassName}
              autoComplete="new-password"
              disabled={saving}
            />
          </div>
          <div>
            <label
              htmlFor="dialog-confirm-password"
              className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1"
            >
              Confirmer le nouveau mot de passe
            </label>
            <input
              id="dialog-confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={inputClassName}
              autoComplete="new-password"
              disabled={saving}
            />
          </div>

          <div className="flex flex-wrap justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={handleClose}
              disabled={saving}
              className="rounded-lg border border-slate-200 dark:border-slate-600 px-3 py-1.5 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={saving || !currentPassword || !newPassword || !confirmPassword}
              className="rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-500 disabled:opacity-50"
            >
              {saving ? "Enregistrement…" : "Enregistrer"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
