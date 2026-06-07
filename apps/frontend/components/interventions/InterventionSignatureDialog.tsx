"use client";

import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { SignaturePad } from "./SignaturePad";
import * as api from "@/lib/cases.api";
import { useToast } from "@/components/ui/ToastProvider";

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

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={handleClose}
    >
      <div
        className="relative mx-4 w-full max-w-md rounded-xl bg-white dark:bg-slate-900 p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={handleClose}
          className="absolute top-3 right-3 p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition"
        >
          <svg
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-1">
          Signature client
        </h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
          {step === "name"
            ? "Saisissez le nom du signataire."
            : "Le client peut signer ci-dessous."}
        </p>

        {step === "name" ? (
          <div className="space-y-4">
            <div>
              <label
                htmlFor="signatory-name"
                className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1"
              >
                Nom du signataire
              </label>
              <input
                id="signatory-name"
                type="text"
                value={signatoryName}
                onChange={(e) => setSignatoryName(e.target.value)}
                placeholder="Nom et prénom"
                className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none transition"
                autoFocus
              />
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleClose}
                className="flex-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={() => setStep("sign")}
                disabled={!signatoryName.trim()}
                className="flex-1 rounded-lg bg-brand-600 hover:bg-brand-700 px-3 py-2 text-sm font-medium text-white transition disabled:opacity-50"
              >
                Suivant
              </button>
            </div>
          </div>
        ) : (
          <SignaturePad
            onSign={handleSign}
            onCancel={() => setStep("name")}
            disabled={signMutation.isPending}
          />
        )}
      </div>
    </div>
  );
}
