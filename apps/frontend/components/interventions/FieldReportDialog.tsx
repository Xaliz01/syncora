"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/components/ui/ToastProvider";
import {
  FormDialog,
  FormDialogCancelButton,
  FormDialogPrimaryButton,
  formFieldInputClassName,
  formFieldLabelClassName,
} from "@/components/ui/FormDialog";
import * as fieldReportApi from "@/lib/ai-field-report.api";
import { normalizeFieldReportText } from "@planwise/shared";

interface Props {
  interventionId: string;
  open: boolean;
  onClose: () => void;
}

type Step = "loading" | "edit" | "error";

export function FieldReportDialog({ interventionId, open, onClose }: Props) {
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const [step, setStep] = useState<Step>("loading");
  const [draft, setDraft] = useState("");
  const [quotaRemaining, setQuotaRemaining] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  const generateMutation = useMutation({
    mutationFn: () => fieldReportApi.generateFieldReport(interventionId),
    onSuccess: (data) => {
      setDraft(normalizeFieldReportText(data.draft));
      setQuotaRemaining(data.quotaRemaining);
      setStep("edit");
    },
    onError: (err: Error) => {
      setErrorMessage(err.message || "Impossible de générer le compte-rendu");
      setStep("error");
    },
  });

  const confirmMutation = useMutation({
    mutationFn: () =>
      fieldReportApi.confirmFieldReport(interventionId, normalizeFieldReportText(draft)),
    onSuccess: () => {
      showToast("Compte-rendu enregistré", "success");
      void queryClient.invalidateQueries({ queryKey: ["my-day-interventions"] });
      void queryClient.invalidateQueries({ queryKey: ["case"] });
      void queryClient.invalidateQueries({ queryKey: ["interventions"] });
      onClose();
    },
    onError: (err: Error) => {
      showToast(err.message || "Erreur lors de l'enregistrement", "error");
    },
  });

  useEffect(() => {
    if (open) {
      setStep("loading");
      setDraft("");
      setErrorMessage("");
      generateMutation.mutate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleConfirm = useCallback(() => {
    if (!draft.trim()) return;
    confirmMutation.mutate();
  }, [confirmMutation, draft]);

  const handleClose = useCallback(() => {
    if (confirmMutation.isPending) return;
    onClose();
  }, [confirmMutation.isPending, onClose]);

  return (
    <FormDialog
      open={open}
      onClose={handleClose}
      title="Compte-rendu d'intervention"
      description={
        step === "edit" && quotaRemaining !== null
          ? `${quotaRemaining} compte${quotaRemaining > 1 ? "s" : ""}-rendu${quotaRemaining > 1 ? "s" : ""} restant${quotaRemaining > 1 ? "s" : ""} ce mois-ci`
          : undefined
      }
      size="lg"
      closeDisabled={confirmMutation.isPending}
      footer={
        step === "edit" ? (
          <div className="flex justify-end gap-2">
            <FormDialogCancelButton onClick={handleClose} disabled={confirmMutation.isPending}>
              Annuler
            </FormDialogCancelButton>
            <FormDialogPrimaryButton
              onClick={handleConfirm}
              disabled={!draft.trim() || confirmMutation.isPending}
            >
              {confirmMutation.isPending ? "Enregistrement…" : "Valider le compte-rendu"}
            </FormDialogPrimaryButton>
          </div>
        ) : step === "error" ? (
          <div className="flex justify-end">
            <FormDialogCancelButton onClick={handleClose}>Fermer</FormDialogCancelButton>
          </div>
        ) : undefined
      }
    >
      {step === "loading" && (
        <div className="flex flex-col items-center justify-center py-12 gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Génération du compte-rendu en cours…
          </p>
        </div>
      )}

      {step === "error" && (
        <div className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30 p-4">
          <p className="text-sm text-red-700 dark:text-red-300">{errorMessage}</p>
        </div>
      )}

      {step === "edit" && (
        <div className="space-y-3">
          <label className={formFieldLabelClassName}>
            Modifiez le compte-rendu si nécessaire avant de le valider
          </label>
          <textarea
            className={formFieldInputClassName}
            rows={10}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            disabled={confirmMutation.isPending}
          />
        </div>
      )}
    </FormDialog>
  );
}
