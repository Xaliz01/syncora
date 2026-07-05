"use client";

import React from "react";
import type { CustomerSiteResponse } from "@planwise/shared";

function formatAddress(address: { line1: string; postalCode: string; city: string }): string {
  return `${address.line1}, ${address.postalCode} ${address.city}`;
}

export function CaseInterventionSitePicker({
  sites,
  value,
  onChange,
  disabled,
}: {
  sites: CustomerSiteResponse[];
  value: string;
  onChange: (siteId: string) => void;
  disabled?: boolean;
}) {
  if (sites.length === 0) return null;

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
        Adresse d&apos;intervention
      </label>
      <p className="text-xs text-slate-500 dark:text-slate-400">
        Sélectionnez le site du client où se déroulera l&apos;intervention.
      </p>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none disabled:opacity-50"
      >
        <option value="">Aucun site sélectionné (adresse principale du client)</option>
        {sites.map((site) => (
          <option key={site.id} value={site.id}>
            {site.label}
            {site.isDefault ? " (par défaut)" : ""} — {formatAddress(site.address)}
          </option>
        ))}
      </select>
    </div>
  );
}
