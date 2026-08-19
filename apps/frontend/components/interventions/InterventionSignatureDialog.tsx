"use client";

import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { SignaturePad } from "./SignaturePad";
import * as api from "@/lib/cases.api";
import { useToast } from "@/components/ui/ToastProvider";
import {
  FormDialog,
  FormDialogCancelButton,
  FormDialogPrimaryButton,
  formFieldInputClassName,
  formFieldLabelClassName,
} from "@/components/ui/FormDialog";

interface Props {
  interventionId: string;
  open: boolean;
  onClose: () => void;
}

export function InterventionSignatureDialog({ interventionId, open, onClose }: Props) {
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const [signatoryName, setSignatoryName] = useState("");
  const [step, setStep] = useState<"name" | "sign">("name");

  const signMutation = useMutation({
    mutationFn: (signatureData: string) =>
      api.signIntervention(interventionId, { signatoryName: signatoryName.trim(), signatureData }),
    onSuccess: () => {
      showToast("Intervention signée avec succès", "success");
      void queryClient.invalidateQueries({ queryKey: ["my-day-interventions"] });
      void queryClient.invalidateQueries({ queryKey: ["case"] });
      void queryClient.invalidateQueries({ queryKey: ["interventions"] });
      onClose();
    },
    onError: (err: Error) => {
      showToast(err.message || "Erreur lors de la signature", "error");
    },
  });

  const handleSign = (signatureData: string) => {
    signMutation.mutate(signatureData);
  };

  const handleClose = () => {
    setStep("name");
    setSignatoryName("");
    onClose();
  };

  return (
    <FormDialog
      open={open}
      onClose={handleClose}
      closeDisabled={signMutation.isPending}
      title="Signature client"
      description={
        step === "name" ? "Saisissez le nom du signataire." : "Le client peut signer ci-dessous."
      }
      titleId="intervention-signature-title"
      size="sm"
      zClassName="z-50"
      footer={
        step === "name" ? (
          <>
            <FormDialogCancelButton onClick={handleClose} />
            <FormDialogPrimaryButton
              type="button"
              onClick={() => setStep("sign")}
              disabled={!signatoryName.trim()}
            >
              Suivant
            </FormDialogPrimaryButton>
          </>
        ) : undefined
      }
    >
      {step === "name" ? (
        <div>
          <label htmlFor="signatory-name" className={formFieldLabelClassName}>
            Nom du signataire
          </label>
          <input
            id="signatory-name"
            type="text"
            value={signatoryName}
            onChange={(e) => setSignatoryName(e.target.value)}
            placeholder="Nom et prénom"
            className={formFieldInputClassName}
            autoFocus
          />
        </div>
      ) : (
        <SignaturePad
          onSign={handleSign}
          onCancel={() => setStep("name")}
          disabled={signMutation.isPending}
        />
      )}
    </FormDialog>
  );
}
