"use client";

import React from "react";
import type { CustomerSiteResponse } from "@planwise/shared";
import {
  formFieldHintClassName,
  formFieldInputClassName,
  formFieldLabelClassName,
} from "@/components/ui/FormDialog";

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
    <div className="space-y-1">
      <label htmlFor="case-intervention-site" className={formFieldLabelClassName}>
        Adresse d&apos;intervention
      </label>
      <p className={formFieldHintClassName}>
        Sélectionnez le site du client où se déroulera l&apos;intervention.
      </p>
      <select
        id="case-intervention-site"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className={formFieldInputClassName}
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
