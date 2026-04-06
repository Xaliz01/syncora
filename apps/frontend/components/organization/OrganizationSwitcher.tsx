"use client";

import { useOrganization } from "@/lib/organization";

export function OrganizationSwitcher() {
  const { organizations, sessionOrganizationId, isLoading, selectOrganization } = useOrganization();

  if (!sessionOrganizationId) {
    return null;
  }

  return (
    <div className="px-3 pt-3 pb-2 border-b border-slate-100">
      <label htmlFor="syncora-org-switcher" className="sr-only">
        Organisation active
      </label>
      <select
        id="syncora-org-switcher"
        className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-sm text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 disabled:opacity-60"
        value={sessionOrganizationId}
        disabled={isLoading || organizations.length === 0}
        onChange={(e) => selectOrganization(e.target.value)}
      >
        {isLoading && <option value={sessionOrganizationId}>Chargement…</option>}
        {!isLoading &&
          organizations.map((org) => (
            <option key={org.id} value={org.id}>
              {org.name}
            </option>
          ))}
      </select>
      {organizations.length > 1 && (
        <p className="mt-1.5 text-[11px] text-slate-500 px-0.5">
          Bientôt : changement d’espace sans se reconnecter.
        </p>
      )}
    </div>
  );
}
