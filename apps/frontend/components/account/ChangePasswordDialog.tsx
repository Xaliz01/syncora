"use client";

import React, { useCallback, useEffect, useState } from "react";
import { getPasswordPolicyError, PASSWORD_POLICY_HINT } from "@planwise/shared";
import * as accountApi from "@/lib/account.api";
import { useToast } from "@/components/ui/ToastProvider";
import {
  FormDialog,
  FormDialogCancelButton,
  FormDialogPrimaryButton,
  formFieldHintClassName,
  formFieldInputClassName,
  formFieldLabelClassName,
} from "@/components/ui/FormDialog";

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
      const policyError = getPasswordPolicyError(newPassword);
      if (policyError) {
        showToast(policyError, "error");
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

  return (
    <FormDialog
      open={open}
      onClose={handleClose}
      closeDisabled={saving}
      title="Modifier mon mot de passe"
      description="Saisissez votre mot de passe actuel puis choisissez un nouveau mot de passe."
      titleId="change-password-title"
      size="sm"
      zClassName="z-[100]"
      onSubmit={(e) => void handleSubmit(e)}
      footer={
        <>
          <FormDialogCancelButton onClick={handleClose} disabled={saving} />
          <FormDialogPrimaryButton
            type="submit"
            disabled={saving || !currentPassword || !newPassword || !confirmPassword}
          >
            {saving ? "Enregistrement…" : "Enregistrer"}
          </FormDialogPrimaryButton>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <label htmlFor="dialog-current-password" className={formFieldLabelClassName}>
            Mot de passe actuel
          </label>
          <input
            id="dialog-current-password"
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className={formFieldInputClassName}
            autoComplete="current-password"
            disabled={saving}
            autoFocus
          />
        </div>
        <div>
          <label htmlFor="dialog-new-password" className={formFieldLabelClassName}>
            Nouveau mot de passe
          </label>
          <input
            id="dialog-new-password"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className={formFieldInputClassName}
            autoComplete="new-password"
            disabled={saving}
          />
          <p className={formFieldHintClassName}>{PASSWORD_POLICY_HINT}</p>
        </div>
        <div>
          <label htmlFor="dialog-confirm-password" className={formFieldLabelClassName}>
            Confirmer le nouveau mot de passe
          </label>
          <input
            id="dialog-confirm-password"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className={formFieldInputClassName}
            autoComplete="new-password"
            disabled={saving}
          />
        </div>
      </div>
    </FormDialog>
  );
}
