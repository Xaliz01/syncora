"use client";

import { useEffect, useRef, useState } from "react";
import { QONTO_INVOICE_NUMBER_REQUIRED_MESSAGE } from "@planwise/shared";
import {
  FormDialog,
  FormDialogCancelButton,
  FormDialogPrimaryButton,
  formFieldInputClassName,
  formFieldLabelClassName,
} from "@/components/ui/FormDialog";

type Props = {
  open: boolean;
  pending: boolean;
  onClose: () => void;
  onSubmit: (invoiceNumber: string) => void;
};

export function QontoInvoiceNumberDialog({ open, pending, onClose, onSubmit }: Props) {
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setInvoiceNumber("");
    const t = window.setTimeout(() => inputRef.current?.focus(), 0);
    return () => window.clearTimeout(t);
  }, [open]);

  return (
    <FormDialog
      open={open}
      onClose={onClose}
      closeDisabled={pending}
      title="Numéro de facture Qonto"
      description={QONTO_INVOICE_NUMBER_REQUIRED_MESSAGE}
      titleId="qonto-invoice-number-title"
      size="sm"
      zClassName="z-[100]"
      onSubmit={(e) => {
        e.preventDefault();
        const value = invoiceNumber.trim();
        if (!value) return;
        onSubmit(value);
      }}
      footer={
        <>
          <FormDialogCancelButton disabled={pending} onClick={onClose} />
          <FormDialogPrimaryButton type="submit" disabled={pending || !invoiceNumber.trim()}>
            {pending ? "Envoi…" : "Envoyer vers Qonto"}
          </FormDialogPrimaryButton>
        </>
      }
    >
      <div>
        <label htmlFor="qonto-invoice-number" className={formFieldLabelClassName}>
          Numéro de facture
        </label>
        <input
          ref={inputRef}
          id="qonto-invoice-number"
          type="text"
          autoComplete="off"
          value={invoiceNumber}
          onChange={(e) => setInvoiceNumber(e.target.value)}
          placeholder="Ex. FAC-2026-001"
          disabled={pending}
          className={formFieldInputClassName}
        />
      </div>
    </FormDialog>
  );
}
