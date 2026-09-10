"use client";

import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  defaultInvoiceEmailBody,
  defaultInvoiceEmailSubject,
  isValidEmailAddress,
  type InvoiceEmailSendEntry,
  type LocalInvoiceResponse,
} from "@planwise/shared";
import * as billingApi from "@/lib/billing.api";
import { useToast } from "@/components/ui/ToastProvider";
import {
  FormDialog,
  FormDialogCancelButton,
  FormDialogPrimaryButton,
  formFieldHintClassName,
  formFieldInputClassName,
  formFieldLabelClassName,
} from "@/components/ui/FormDialog";

export function lastInvoiceEmailHint(invoice: LocalInvoiceResponse): string | undefined {
  const last = invoice.emailSends?.at(-1);
  if (!last) return undefined;
  const date = new Date(last.sentAt).toLocaleString("fr-FR", {
    dateStyle: "short",
    timeStyle: "short",
  });
  if (last.status === "sent") return `Envoyée le ${date} à ${last.to}`;
  return `Dernier envoi échoué le ${date}`;
}

export function InvoiceEmailHistoryList({
  invoice,
  className = "mt-1 space-y-1 text-xs text-slate-500 dark:text-slate-400",
}: {
  invoice: LocalInvoiceResponse;
  className?: string;
}) {
  const history = invoice.emailSends ?? [];
  if (history.length === 0) return null;
  return (
    <ul className={className}>
      {[...history].reverse().map((entry, index) => (
        <li key={`${entry.sentAt}-${index}`}>{formatSendEntry(entry)}</li>
      ))}
    </ul>
  );
}

function formatSendEntry(entry: InvoiceEmailSendEntry): string {
  const date = new Date(entry.sentAt).toLocaleString("fr-FR", {
    dateStyle: "short",
    timeStyle: "short",
  });
  const who = entry.sentByName ? ` par ${entry.sentByName}` : "";
  const dest = entry.cc?.length ? `${entry.to} (cc ${entry.cc.join(", ")})` : entry.to;
  if (entry.status === "sent") return `${date} · Envoyée à ${dest}${who}`;
  return `${date} · Échec vers ${dest}${who}`;
}

export function SendInvoiceDialog({
  invoice,
  open,
  onClose,
  onSent,
}: {
  invoice: LocalInvoiceResponse | null;
  open: boolean;
  onClose: () => void;
  onSent?: () => void;
}) {
  const { showToast } = useToast();
  const [to, setTo] = useState("");
  const [cc, setCc] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!open || !invoice) return;
    setTo(invoice.customer.email ?? "");
    setCc("");
    setSubject(defaultInvoiceEmailSubject(invoice));
    setMessage(defaultInvoiceEmailBody(invoice));
  }, [open, invoice]);

  const sendMutation = useMutation({
    mutationFn: () => {
      if (!invoice) throw new Error("Facture introuvable");
      const ccList = cc
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean);
      return billingApi.sendInvoice(invoice.id, {
        to: to.trim(),
        cc: ccList.length > 0 ? ccList : undefined,
        subject: subject.trim(),
        body: message.trim(),
      });
    },
    onSuccess: () => {
      showToast("Facture envoyée.");
      onSent?.();
      onClose();
    },
    onError: (err: Error) => showToast(err.message, "error"),
  });

  if (!invoice) return null;

  const history = invoice.emailSends ?? [];

  return (
    <FormDialog
      open={open}
      onClose={onClose}
      title="Envoyer la facture"
      description="Vérifiez le destinataire et le message avant d’envoyer."
      closeDisabled={sendMutation.isPending}
      onSubmit={(event) => {
        event.preventDefault();
        if (!isValidEmailAddress(to)) {
          showToast("Indiquez une adresse e-mail valide.", "error");
          return;
        }
        sendMutation.mutate();
      }}
      footer={
        <>
          <FormDialogCancelButton onClick={onClose} disabled={sendMutation.isPending}>
            Annuler
          </FormDialogCancelButton>
          <FormDialogPrimaryButton type="submit" disabled={sendMutation.isPending}>
            {sendMutation.isPending ? "Envoi…" : "Envoyer"}
          </FormDialogPrimaryButton>
        </>
      }
    >
      <div className="space-y-4">
        <label className="block">
          <span className={formFieldLabelClassName}>Destinataire</span>
          <input
            type="email"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className={formFieldInputClassName}
            autoComplete="email"
            required
          />
        </label>
        <label className="block">
          <span className={formFieldLabelClassName}>Copie (optionnel)</span>
          <input
            type="text"
            value={cc}
            onChange={(e) => setCc(e.target.value)}
            className={formFieldInputClassName}
            placeholder="autre@exemple.fr"
          />
          <p className={formFieldHintClassName}>Séparez plusieurs adresses par une virgule.</p>
        </label>
        <label className="block">
          <span className={formFieldLabelClassName}>Objet</span>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className={formFieldInputClassName}
          />
        </label>
        <label className="block">
          <span className={formFieldLabelClassName}>Message</span>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className={`${formFieldInputClassName} min-h-[7rem]`}
            rows={5}
          />
          <p className={formFieldHintClassName}>Le PDF de la facture sera joint.</p>
        </label>
        {history.length > 0 ? (
          <div>
            <p className={formFieldLabelClassName}>Envois précédents</p>
            <InvoiceEmailHistoryList invoice={invoice} />
          </div>
        ) : null}
      </div>
    </FormDialog>
  );
}
