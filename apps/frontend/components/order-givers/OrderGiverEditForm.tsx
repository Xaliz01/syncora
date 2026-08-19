"use client";

import React, { useEffect, useMemo, useState } from "react";
import type { CustomerKind, OrderGiverResponse, SiretLookupResult } from "@planwise/shared";
import type { UpdateOrderGiverPayload } from "@/lib/order-givers.api";
import { PostalAddressFields } from "@/components/address/PostalAddressFields";
import { SiretLookupField } from "@/components/organization/SiretLookupField";
import { CUSTOMER_KIND_LABELS } from "@/components/customers/customer-kind-labels";

type Props = {
  orderGiver: OrderGiverResponse;
  onSubmit: (payload: UpdateOrderGiverPayload) => void;
  onCancel: () => void;
  isPending: boolean;
  error?: string;
  hideActions?: boolean;
  formId?: string;
};

export function OrderGiverEditForm({
  orderGiver,
  onSubmit,
  onCancel,
  isPending,
  error,
  hideActions = false,
  formId,
}: Props) {
  const [localError, setLocalError] = useState("");
  const [kind, setKind] = useState<CustomerKind>(orderGiver.kind);
  const [firstName, setFirstName] = useState(orderGiver.firstName ?? "");
  const [lastName, setLastName] = useState(orderGiver.lastName ?? "");
  const [companyName, setCompanyName] = useState(orderGiver.companyName ?? "");
  const [legalId, setLegalId] = useState(orderGiver.legalIdentifier ?? "");
  const [email, setEmail] = useState(orderGiver.email ?? "");
  const [phone, setPhone] = useState(orderGiver.phone ?? "");
  const [mobile, setMobile] = useState(orderGiver.mobile ?? "");
  const [notes, setNotes] = useState(orderGiver.notes ?? "");
  const [addrLine1, setAddrLine1] = useState(orderGiver.address?.line1 ?? "");
  const [addrLine2, setAddrLine2] = useState(orderGiver.address?.line2 ?? "");
  const [addrPostal, setAddrPostal] = useState(orderGiver.address?.postalCode ?? "");
  const [addrCity, setAddrCity] = useState(orderGiver.address?.city ?? "");
  const [addrCountry, setAddrCountry] = useState(orderGiver.address?.country ?? "FR");
  const [addressOpen, setAddressOpen] = useState(Boolean(orderGiver.address?.line1));

  useEffect(() => {
    setKind(orderGiver.kind);
    setFirstName(orderGiver.firstName ?? "");
    setLastName(orderGiver.lastName ?? "");
    setCompanyName(orderGiver.companyName ?? "");
    setLegalId(orderGiver.legalIdentifier ?? "");
    setEmail(orderGiver.email ?? "");
    setPhone(orderGiver.phone ?? "");
    setMobile(orderGiver.mobile ?? "");
    setNotes(orderGiver.notes ?? "");
    setAddrLine1(orderGiver.address?.line1 ?? "");
    setAddrLine2(orderGiver.address?.line2 ?? "");
    setAddrPostal(orderGiver.address?.postalCode ?? "");
    setAddrCity(orderGiver.address?.city ?? "");
    setAddrCountry(orderGiver.address?.country ?? "FR");
    setAddressOpen(Boolean(orderGiver.address?.line1));
  }, [orderGiver]);

  const handleSiretSelect = (result: SiretLookupResult) => {
    setLegalId(result.siret);
    if (result.nom) setCompanyName(result.nom);
    setAddrLine1(result.addressLine1 ?? "");
    setAddrLine2(result.addressLine2 ?? "");
    setAddrPostal(result.postalCode ?? "");
    setAddrCity(result.city ?? "");
    setAddrCountry(result.country || "FR");
    if (result.addressLine1 || result.postalCode || result.city) {
      setAddressOpen(true);
    }
  };

  const addressPayload = useMemo((): UpdateOrderGiverPayload["address"] => {
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
    const base: UpdateOrderGiverPayload = {
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
    <form id={formId} onSubmit={handleSubmit} className="space-y-5">
      {showError ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {showError}
        </div>
      ) : null}

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
        <>
          <SiretLookupField
            label="SIRET (optionnel)"
            value={legalId}
            onChange={setLegalId}
            onSelect={handleSiretSelect}
            labelCls={labelCls}
            inputCls={inputCls}
          />
          <div>
            <label className={labelCls}>Raison sociale</label>
            <input
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              className={inputCls}
            />
          </div>
        </>
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

      <details
        open={addressOpen}
        onToggle={(e) => setAddressOpen((e.target as HTMLDetailsElement).open)}
        className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950/80 px-3 py-2"
      >
        <summary className="cursor-pointer text-sm font-medium text-slate-700 dark:text-slate-200">
          Adresse postale (optionnel)
        </summary>
        <div className="mt-3">
          <PostalAddressFields
            legend="Saisie guidée par la Base Adresse Nationale (France). Préremplie via le SIRET si disponible."
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

      {!hideActions ? (
        <div className="flex flex-wrap justify-end gap-3 pt-1">
          <button
            type="button"
            onClick={onCancel}
            disabled={isPending}
            className="rounded-lg border border-slate-200 dark:border-slate-700 px-5 py-2 text-sm text-slate-600 dark:text-slate-300 transition hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={isPending}
            className="rounded-lg bg-brand-600 px-5 py-2 text-sm font-medium text-white transition hover:bg-brand-500 disabled:opacity-50"
          >
            {isPending ? "Enregistrement…" : "Enregistrer"}
          </button>
        </div>
      ) : null}
    </form>
  );
}
