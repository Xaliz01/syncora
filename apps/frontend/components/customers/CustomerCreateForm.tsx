"use client";

import React, { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import * as customersApi from "@/lib/customers.api";
import type { CustomerKind, CustomerResponse } from "@syncora/shared";
import { PostalAddressFields } from "@/components/address/PostalAddressFields";
import { CUSTOMER_KIND_LABELS } from "./customer-kind-labels";

type Props = {
  onSuccess: (customer: CustomerResponse) => void;
  /** Picker : retour à la liste. Page : bouton Annuler (même style que les autres créations). */
  onCancel?: () => void;
  submitLabel?: string;
  /** Intégré au menu du picker dossier (en-tête + champs compacts + scroll). */
  compact?: boolean;
};

export function CustomerCreateForm({
  onSuccess,
  onCancel,
  submitLabel = "Créer le client",
  compact = false
}: Props) {
  const queryClient = useQueryClient();
  const [createError, setCreateError] = useState("");
  const [newKind, setNewKind] = useState<CustomerKind>("individual");
  const [newFirstName, setNewFirstName] = useState("");
  const [newLastName, setNewLastName] = useState("");
  const [newCompanyName, setNewCompanyName] = useState("");
  const [newLegalId, setNewLegalId] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newMobile, setNewMobile] = useState("");
  const [addrLine1, setAddrLine1] = useState("");
  const [addrLine2, setAddrLine2] = useState("");
  const [addrPostal, setAddrPostal] = useState("");
  const [addrCity, setAddrCity] = useState("");
  const [addrCountry, setAddrCountry] = useState("FR");

  const labelCls = compact ? "mb-0.5 block text-xs font-medium text-slate-600 dark:text-slate-300" : "mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200";
  const inputCls = compact
    ? "w-full rounded-md border border-slate-200 dark:border-slate-700 px-2 py-1.5 text-sm"
    : "w-full rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500";

  const resetForm = () => {
    setNewKind("individual");
    setNewFirstName("");
    setNewLastName("");
    setNewCompanyName("");
    setNewLegalId("");
    setNewEmail("");
    setNewPhone("");
    setNewMobile("");
    setAddrLine1("");
    setAddrLine2("");
    setAddrPostal("");
    setAddrCity("");
    setAddrCountry("FR");
    setCreateError("");
  };

  const createMutation = useMutation({
    mutationFn: (payload: customersApi.CreateCustomerPayload) => customersApi.createCustomer(payload),
    onSuccess: (c: CustomerResponse) => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      resetForm();
      onSuccess(c);
    },
    onError: (err: Error) => setCreateError(err.message)
  });

  const addressPayload = useMemo(() => {
    if (!addrLine1.trim() || !addrPostal.trim() || !addrCity.trim()) return undefined;
    return {
      line1: addrLine1.trim(),
      line2: addrLine2.trim() || undefined,
      postalCode: addrPostal.trim(),
      city: addrCity.trim(),
      country: addrCountry.trim() || "FR"
    };
  }, [addrLine1, addrLine2, addrPostal, addrCity, addrCountry]);

  const submitCreate = (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError("");
    const base = {
      kind: newKind,
      email: newEmail.trim() || undefined,
      phone: newPhone.trim() || undefined,
      mobile: newMobile.trim() || undefined,
      legalIdentifier: newLegalId.trim() || undefined,
      address: addressPayload,
      notes: undefined
    };
    if (newKind === "company") {
      if (!newCompanyName.trim()) {
        setCreateError("La raison sociale est obligatoire.");
        return;
      }
      createMutation.mutate({
        ...base,
        companyName: newCompanyName.trim()
      });
    } else {
      if (!newFirstName.trim() && !newLastName.trim()) {
        setCreateError("Indiquez au moins un prénom ou un nom.");
        return;
      }
      createMutation.mutate({
        ...base,
        firstName: newFirstName.trim() || undefined,
        lastName: newLastName.trim() || undefined
      });
    }
  };

  const kindBtnCls = (k: CustomerKind) =>
    `rounded-lg border px-3 py-1.5 font-medium transition ${
      newKind === k
        ? "border-brand-500 bg-brand-50 text-brand-800"
        : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
    } ${compact ? "text-xs" : "text-sm"}`;

  const formInner = (
    <>
      {compact && (
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-medium text-slate-800 dark:text-slate-100">Nouveau client</span>
          {onCancel && (
            <button
              type="button"
              onClick={() => {
                resetForm();
                onCancel();
              }}
              className="text-xs text-brand-600 dark:text-brand-400 hover:text-brand-500"
            >
              Retour à la liste
            </button>
          )}
        </div>
      )}

      {createError && (
        <div
          className={
            compact
              ? "rounded-md border border-red-200 bg-red-50 px-2 py-1.5 text-xs text-red-700"
              : "rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
          }
        >
          {createError}
        </div>
      )}

      <div>
        <span className={labelCls}>Type</span>
        <div className="mt-1 flex flex-wrap gap-2">
          {(["individual", "company"] as const).map((k) => (
            <button key={k} type="button" onClick={() => setNewKind(k)} className={kindBtnCls(k)}>
              {CUSTOMER_KIND_LABELS[k]}
            </button>
          ))}
        </div>
      </div>

      {newKind === "individual" ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className={labelCls}>Prénom</label>
            <input value={newFirstName} onChange={(e) => setNewFirstName(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Nom</label>
            <input value={newLastName} onChange={(e) => setNewLastName(e.target.value)} className={inputCls} />
          </div>
        </div>
      ) : (
        <div>
          <label className={labelCls}>Raison sociale</label>
          <input value={newCompanyName} onChange={(e) => setNewCompanyName(e.target.value)} className={inputCls} />
        </div>
      )}

      {newKind === "company" && (
        <div>
          <label className={labelCls}>SIRET / identifiant (optionnel)</label>
          <input value={newLegalId} onChange={(e) => setNewLegalId(e.target.value)} className={inputCls} />
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div>
          <label className={labelCls}>E-mail</label>
          <input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Téléphone</label>
          <input value={newPhone} onChange={(e) => setNewPhone(e.target.value)} className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Mobile</label>
          <input value={newMobile} onChange={(e) => setNewMobile(e.target.value)} className={inputCls} />
        </div>
      </div>

      <details
        className={
          compact
            ? "rounded-md border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/80 px-2 py-2"
            : "rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950/80 px-3 py-2"
        }
      >
        <summary className={`cursor-pointer font-medium text-slate-700 dark:text-slate-200 ${compact ? "text-xs" : "text-sm"}`}>
          Adresse postale (optionnel)
        </summary>
        <div className="mt-2">
          <PostalAddressFields
            legend="Saisie guidée par la Base Adresse Nationale (France)."
            line1={addrLine1}
            line2={addrLine2}
            postalCode={addrPostal}
            city={addrCity}
            country={addrCountry}
            onLine1Change={setAddrLine1}
            onLine2Change={setAddrLine2}
            onPostalChange={setAddrPostal}
            onCityChange={setAddrCity}
            onCountryChange={setAddrCountry}
            compact={compact}
            labelCls={labelCls}
            inputCls={inputCls}
          />
        </div>
      </details>

      {compact ? (
        <button
          type="submit"
          disabled={createMutation.isPending}
          className="w-full rounded-lg bg-brand-600 py-2 text-sm font-medium text-white transition hover:bg-brand-500 disabled:opacity-50"
        >
          {createMutation.isPending ? "Création…" : submitLabel}
        </button>
      ) : (
        <div className="flex flex-wrap gap-3 pt-1">
          <button
            type="submit"
            disabled={createMutation.isPending}
            className="rounded-lg bg-brand-600 px-5 py-2 text-sm font-medium text-white transition hover:bg-brand-500 disabled:opacity-50"
          >
            {createMutation.isPending ? "Création…" : submitLabel}
          </button>
          {onCancel && (
            <button
              type="button"
              onClick={() => {
                resetForm();
                onCancel();
              }}
              className="rounded-lg border border-slate-200 dark:border-slate-700 px-5 py-2 text-sm text-slate-600 dark:text-slate-300 transition hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              Annuler
            </button>
          )}
        </div>
      )}
    </>
  );

  const form = (
    <form onSubmit={submitCreate} className={compact ? "space-y-3" : "space-y-5"}>
      {formInner}
    </form>
  );

  if (compact) {
    return <div className="max-h-[70vh] overflow-y-auto p-3">{form}</div>;
  }

  return form;
}
