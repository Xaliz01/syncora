"use client";

import React, { useEffect, useMemo, useState } from "react";
import type { CustomerKind, CustomerResponse } from "@syncora/shared";
import type { UpdateCustomerPayload } from "@/lib/customers.api";
import { PostalAddressFields } from "@/components/address/PostalAddressFields";
import { CUSTOMER_KIND_LABELS } from "./customer-kind-labels";

type Props = {
  customer: CustomerResponse;
  onSubmit: (payload: UpdateCustomerPayload) => void;
  onCancel: () => void;
  isPending: boolean;
  error?: string;
};

export function CustomerEditForm({ customer, onSubmit, onCancel, isPending, error }: Props) {
  const [localError, setLocalError] = useState("");
  const [kind, setKind] = useState<CustomerKind>(customer.kind);
  const [firstName, setFirstName] = useState(customer.firstName ?? "");
  const [lastName, setLastName] = useState(customer.lastName ?? "");
  const [companyName, setCompanyName] = useState(customer.companyName ?? "");
  const [legalId, setLegalId] = useState(customer.legalIdentifier ?? "");
  const [email, setEmail] = useState(customer.email ?? "");
  const [phone, setPhone] = useState(customer.phone ?? "");
  const [mobile, setMobile] = useState(customer.mobile ?? "");
  const [notes, setNotes] = useState(customer.notes ?? "");
  const [addrLine1, setAddrLine1] = useState(customer.address?.line1 ?? "");
  const [addrLine2, setAddrLine2] = useState(customer.address?.line2 ?? "");
  const [addrPostal, setAddrPostal] = useState(customer.address?.postalCode ?? "");
  const [addrCity, setAddrCity] = useState(customer.address?.city ?? "");
  const [addrCountry, setAddrCountry] = useState(customer.address?.country ?? "FR");

  useEffect(() => {
    setKind(customer.kind);
    setFirstName(customer.firstName ?? "");
    setLastName(customer.lastName ?? "");
    setCompanyName(customer.companyName ?? "");
    setLegalId(customer.legalIdentifier ?? "");
    setEmail(customer.email ?? "");
    setPhone(customer.phone ?? "");
    setMobile(customer.mobile ?? "");
    setNotes(customer.notes ?? "");
    setAddrLine1(customer.address?.line1 ?? "");
    setAddrLine2(customer.address?.line2 ?? "");
    setAddrPostal(customer.address?.postalCode ?? "");
    setAddrCity(customer.address?.city ?? "");
    setAddrCountry(customer.address?.country ?? "FR");
  }, [customer]);

  const addressPayload = useMemo((): UpdateCustomerPayload["address"] => {
    if (!addrLine1.trim() || !addrPostal.trim() || !addrCity.trim()) return null;
    return {
      line1: addrLine1.trim(),
      line2: addrLine2.trim() || undefined,
      postalCode: addrPostal.trim(),
      city: addrCity.trim(),
      country: addrCountry.trim() || "FR",
    };
  }, [addrLine1, addrLine2, addrPostal, addrCity, addrCountry]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError("");
    if (kind === "company" && !companyName.trim()) {
      setLocalError("La raison sociale est obligatoire.");
      return;
    }
    if (kind === "individual" && !firstName.trim() && !lastName.trim()) {
      setLocalError("Indiquez au moins un prénom ou un nom.");
      return;
    }
    const base: UpdateCustomerPayload = {
      kind,
      email: email.trim() || null,
      phone: phone.trim() || null,
      mobile: mobile.trim() || null,
      legalIdentifier: kind === "company" ? legalId.trim() || null : null,
      notes: notes.trim() || null,
      address: addressPayload,
    };
    if (kind === "individual") {
      onSubmit({
        ...base,
        firstName: firstName.trim() || null,
        lastName: lastName.trim() || null,
        companyName: null,
      });
    } else {
      onSubmit({
        ...base,
        companyName: companyName.trim() || null,
        firstName: null,
        lastName: null,
      });
    }
  };

  const labelCls = "mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200";
  const inputCls =
    "w-full rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500";

  const showError = localError || error;

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {showError && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {showError}
        </div>
      )}

      <div>
        <span className={labelCls}>Type</span>
        <div className="mt-1 flex flex-wrap gap-2">
          {(["individual", "company"] as const).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setKind(k)}
              className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition ${
                kind === k
                  ? "border-brand-500 bg-brand-50 text-brand-800"
                  : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
              }`}
            >
              {CUSTOMER_KIND_LABELS[k]}
            </button>
          ))}
        </div>
      </div>

      {kind === "individual" ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className={labelCls}>Prénom</label>
            <input
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Nom</label>
            <input
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className={inputCls}
            />
          </div>
        </div>
      ) : (
        <div>
          <label className={labelCls}>Raison sociale</label>
          <input
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            className={inputCls}
          />
        </div>
      )}

      {kind === "company" && (
        <div>
          <label className={labelCls}>SIRET / identifiant (optionnel)</label>
          <input
            value={legalId}
            onChange={(e) => setLegalId(e.target.value)}
            className={inputCls}
          />
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div>
          <label className={labelCls}>E-mail</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputCls}
          />
        </div>
        <div>
          <label className={labelCls}>Téléphone</label>
          <input value={phone} onChange={(e) => setPhone(e.target.value)} className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Mobile</label>
          <input value={mobile} onChange={(e) => setMobile(e.target.value)} className={inputCls} />
        </div>
      </div>

      <div>
        <label className={labelCls}>Notes (optionnel)</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          className={inputCls}
          placeholder="Informations internes…"
        />
      </div>

      <details className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950/80 px-3 py-2">
        <summary className="cursor-pointer text-sm font-medium text-slate-700 dark:text-slate-200">
          Adresse postale (optionnel)
        </summary>
        <div className="mt-3">
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
            labelCls={labelCls}
            inputCls={inputCls}
          />
        </div>
      </details>

      <div className="flex flex-wrap gap-3 pt-1">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-brand-600 px-5 py-2 text-sm font-medium text-white transition hover:bg-brand-500 disabled:opacity-50"
        >
          {isPending ? "Enregistrement…" : "Enregistrer"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={isPending}
          className="rounded-lg border border-slate-200 dark:border-slate-700 px-5 py-2 text-sm text-slate-600 dark:text-slate-300 transition hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50"
        >
          Annuler
        </button>
      </div>
    </form>
  );
}
