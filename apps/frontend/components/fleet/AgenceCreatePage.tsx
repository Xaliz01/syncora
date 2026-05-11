"use client";

import { useRouter } from "next/navigation";
import React, { useState } from "react";
import { PostalAddressFields } from "@/components/address/PostalAddressFields";
import * as fleetApi from "@/lib/fleet.api";
import { useToast } from "@/components/ui/ToastProvider";

export function AgenceCreatePage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await fleetApi.createAgence({
        name: name.trim(),
        address: address.trim() || undefined,
        city: city.trim() || undefined,
        postalCode: postalCode.trim() || undefined,
        phone: phone.trim() || undefined
      });
      showToast("Agence créée avec succès.");
      router.push("/fleet/agences");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible de créer l'agence");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-xl sm:text-2xl font-semibold">Ajouter une agence</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Renseignez les informations de l&apos;agence (site, base).
        </p>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm p-3">
          {error}
        </div>
      )}

      <section className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 sm:p-5">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">
              Nom <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              placeholder="Agence Paris Nord"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>

          <PostalAddressFields
            legend="Adresse du site (Base Adresse Nationale)"
            line1={address}
            line2=""
            postalCode={postalCode}
            city={city}
            country="FR"
            onLine1Change={setAddress}
            onLine2Change={() => {}}
            onPostalChange={setPostalCode}
            onCityChange={setCity}
            onCountryChange={() => {}}
            showLine2={false}
            showCountry={false}
            labelCls="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200"
            inputCls="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">Téléphone</label>
            <input
              type="tel"
              placeholder="01 23 45 67 89"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-500 disabled:opacity-50 transition"
            >
              {saving ? "Enregistrement..." : "Ajouter l'agence"}
            </button>
            <button
              type="button"
              onClick={() => router.push("/fleet/agences")}
              className="rounded-lg border border-slate-200 dark:border-slate-700 px-4 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
            >
              Annuler
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
