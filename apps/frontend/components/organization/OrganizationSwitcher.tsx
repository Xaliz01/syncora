"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { SiretLookupResult } from "@planwise/shared";
import { useAuth } from "@/components/auth/AuthContext";
import { useOrganization } from "@/lib/organization";
import { hasPermission } from "@/lib/auth-permissions";
import { useToast } from "@/components/ui/ToastProvider";
import { SiretLookupField } from "@/components/organization/SiretLookupField";
import { PostalAddressFields } from "@/components/address/PostalAddressFields";
import {
  EMPTY_ORG_ADDRESS,
  addressFromSiretLookup,
  isOrganizationAddressComplete,
  toCreateOrganizationAddress,
  type OrganizationAddressForm,
} from "@/lib/organization-address";

export function OrganizationSwitcher({
  variant = "sidebar",
  collapsed = false,
}: {
  variant?: "sidebar" | "gate";
  collapsed?: boolean;
}) {
  const { user, createOrganization } = useAuth();
  const canCreateOrganization = hasPermission(user, "organizations.create");
  const {
    organizations,
    sessionOrganizationId,
    activeOrganization,
    isLoading,
    isSwitchingOrganization,
    selectOrganization,
    refetchOrganizations,
  } = useOrganization();
  const { showToast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [orgMenuOpen, setOrgMenuOpen] = useState(false);
  const [newOrgName, setNewOrgName] = useState("");
  const [newOrgSiret, setNewOrgSiret] = useState("");
  const [newOrgAddress, setNewOrgAddress] = useState<OrganizationAddressForm>(EMPTY_ORG_ADDRESS);
  const [creating, setCreating] = useState(false);
  const [portalReady, setPortalReady] = useState(false);

  useEffect(() => {
    setPortalReady(true);
  }, []);

  useEffect(() => {
    if (!dialogOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [dialogOpen]);

  const resetNewOrgForm = () => {
    setNewOrgName("");
    setNewOrgSiret("");
    setNewOrgAddress(EMPTY_ORG_ADDRESS);
  };

  useEffect(() => {
    if (!collapsed) {
      setOrgMenuOpen(false);
    }
  }, [collapsed]);

  useEffect(() => {
    if (!orgMenuOpen) {
      return;
    }
    const close = () => setOrgMenuOpen(false);
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [orgMenuOpen]);

  if (!sessionOrganizationId) {
    return null;
  }

  const handleSiretSelect = (result: SiretLookupResult) => {
    if (result.nom && !newOrgName.trim()) {
      setNewOrgName(result.nom);
    }
    setNewOrgAddress(addressFromSiretLookup(result));
  };

  const handleCreateOrganization = async () => {
    const name = newOrgName.trim();
    if (!name) {
      showToast("Indiquez un nom d\u2019organisation.", "error");
      return;
    }
    const siret = newOrgSiret.trim();
    if (!siret) {
      showToast("Indiquez le SIRET de l\u2019organisation.", "error");
      return;
    }
    if (!isOrganizationAddressComplete(newOrgAddress)) {
      showToast("Renseignez l\u2019adresse postale (rue, code postal et ville).", "error");
      return;
    }
    setCreating(true);
    try {
      await createOrganization({
        name,
        siret,
        ...toCreateOrganizationAddress(newOrgAddress),
      });
      setDialogOpen(false);
      resetNewOrgForm();
      showToast("Organisation cr\u00e9\u00e9e. Vous travaillez maintenant dans cet espace.");
      refetchOrganizations();
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Cr\u00e9ation impossible.", "error");
    } finally {
      setCreating(false);
    }
  };

  const shellClass =
    variant === "gate"
      ? "space-y-2"
      : collapsed
        ? "relative px-2 pt-3 pb-2 flex flex-col items-center"
        : "px-3 pt-3 pb-2";

  const selectClass =
    variant === "gate"
      ? "w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-sm text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 disabled:opacity-60 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
      : "w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 px-2.5 py-2 text-sm text-slate-900 dark:text-slate-100 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 disabled:opacity-60";

  const createBtnClass =
    variant === "gate"
      ? "mt-2 w-full rounded-lg border border-dashed border-slate-300 bg-white/90 px-2.5 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 transition dark:border-slate-600 dark:bg-slate-900/40 dark:text-slate-300 dark:hover:bg-slate-800"
      : collapsed
        ? "mt-2 flex h-9 w-9 items-center justify-center rounded-lg border border-dashed border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition text-sm font-medium"
        : "mt-2 w-full rounded-lg border border-dashed border-slate-300 dark:border-slate-600 bg-white/60 dark:bg-slate-900/40 px-2.5 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition";

  const switcherId = variant === "gate" ? "planwise-org-switcher-gate" : "planwise-org-switcher";

  return (
    <div className={shellClass}>
      {variant === "gate" && (
        <p className="text-[11px] uppercase tracking-wide text-slate-400 dark:text-slate-500">
          Espace synchronis\u00e9
        </p>
      )}

      {variant === "gate" && organizations.length <= 1 && !isLoading ? (
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Organisation :{" "}
          <span className="font-medium text-slate-900 dark:text-white">
            {activeOrganization?.name ?? "\u2014"}
          </span>
        </p>
      ) : collapsed && variant === "sidebar" ? (
        <div className="relative w-full flex flex-col items-center gap-2">
          <button
            type="button"
            title={activeOrganization?.name ?? "Organisation"}
            onClick={(e) => {
              e.stopPropagation();
              setOrgMenuOpen((open) => !open);
            }}
            className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600/10 text-brand-700 dark:text-brand-300 text-sm font-semibold hover:bg-brand-600/15 transition"
            aria-expanded={orgMenuOpen}
            aria-haspopup="listbox"
          >
            {(activeOrganization?.name?.trim()?.charAt(0) ?? "?").toUpperCase()}
          </button>
          {orgMenuOpen && (
            <ul
              role="listbox"
              className="absolute left-full top-0 z-50 ml-2 min-w-[200px] rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 py-1 shadow-lg"
            >
              {organizations.map((org) => (
                <li key={org.id}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={org.id === sessionOrganizationId}
                    className={`w-full px-3 py-2 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-800 ${
                      org.id === sessionOrganizationId
                        ? "font-medium text-brand-600 dark:text-brand-400"
                        : "text-slate-700 dark:text-slate-200"
                    }`}
                    onClick={() => {
                      setOrgMenuOpen(false);
                      void selectOrganization(org.id);
                    }}
                  >
                    {org.name}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : (
        <>
          <label htmlFor={switcherId} className="sr-only">
            Organisation active
          </label>
          <select
            id={switcherId}
            className={selectClass}
            value={sessionOrganizationId}
            disabled={isLoading || isSwitchingOrganization || organizations.length === 0}
            onChange={(e) => void selectOrganization(e.target.value)}
          >
            {isLoading && <option value={sessionOrganizationId}>Chargement\u2026</option>}
            {!isLoading &&
              organizations.map((org) => (
                <option key={org.id} value={org.id}>
                  {org.name}
                </option>
              ))}
          </select>
          {variant === "gate" && organizations.length > 1 && (
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Basculez vers un autre espace si vous y avez d\u00e9j\u00e0 activ\u00e9
              l&apos;abonnement.
            </p>
          )}
        </>
      )}

      {canCreateOrganization && (
        <button
          type="button"
          onClick={() => setDialogOpen(true)}
          className={createBtnClass}
          title={collapsed && variant === "sidebar" ? "Nouvelle organisation" : undefined}
        >
          {collapsed && variant === "sidebar" ? "+" : "+ Nouvelle organisation"}
        </button>
      )}

      {portalReady &&
        dialogOpen &&
        createPortal(
          <div
            className="fixed inset-0 z-[200] flex items-start sm:items-center justify-center overflow-y-auto bg-slate-950/50 p-4 pt-16 sm:pt-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="planwise-new-org-title"
            onClick={() => {
              if (creating) return;
              setDialogOpen(false);
              resetNewOrgForm();
            }}
          >
            <div
              className="my-auto w-full max-w-md max-h-[calc(100dvh-5rem)] sm:max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xl p-5"
              onClick={(e) => e.stopPropagation()}
            >
              <h2
                id="planwise-new-org-title"
                className="text-lg font-semibold text-slate-900 dark:text-slate-100"
              >
                Nouvelle organisation
              </h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Un espace distinct sera créé et votre session y sera associée.
              </p>
              <div className="mt-4 space-y-3">
                <SiretLookupField
                  value={newOrgSiret}
                  onChange={setNewOrgSiret}
                  onSelect={handleSiretSelect}
                  disabled={creating}
                  labelCls="block text-xs font-medium text-slate-600 dark:text-slate-300"
                  inputCls="mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-950 px-3 py-2 text-sm text-slate-900 dark:text-slate-100"
                />
                <div>
                  <label
                    htmlFor="planwise-new-org-name"
                    className="block text-xs font-medium text-slate-600 dark:text-slate-300"
                  >
                    Nom
                  </label>
                  <input
                    id="planwise-new-org-name"
                    type="text"
                    value={newOrgName}
                    onChange={(e) => setNewOrgName(e.target.value)}
                    placeholder="Ex. Ma société"
                    className="mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-950 px-3 py-2 text-sm text-slate-900 dark:text-slate-100"
                    disabled={creating}
                    autoFocus
                  />
                </div>
                <PostalAddressFields
                  legend="Adresse postale"
                  compact
                  line1={newOrgAddress.addressLine1}
                  line2={newOrgAddress.addressLine2}
                  postalCode={newOrgAddress.postalCode}
                  city={newOrgAddress.city}
                  country={newOrgAddress.country}
                  onLine1Change={(v) => setNewOrgAddress((prev) => ({ ...prev, addressLine1: v }))}
                  onLine2Change={(v) => setNewOrgAddress((prev) => ({ ...prev, addressLine2: v }))}
                  onPostalChange={(v) => setNewOrgAddress((prev) => ({ ...prev, postalCode: v }))}
                  onCityChange={(v) => setNewOrgAddress((prev) => ({ ...prev, city: v }))}
                  onCountryChange={(v) => setNewOrgAddress((prev) => ({ ...prev, country: v }))}
                  labelCls="block text-xs font-medium text-slate-600 dark:text-slate-300"
                  inputCls="mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-950 px-3 py-2 text-sm text-slate-900 dark:text-slate-100"
                />
              </div>
              <div className="mt-5 flex flex-wrap justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setDialogOpen(false);
                    resetNewOrgForm();
                  }}
                  disabled={creating}
                  className="rounded-lg border border-slate-200 dark:border-slate-600 px-3 py-1.5 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={() => void handleCreateOrganization()}
                  disabled={creating}
                  className="rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-500 disabled:opacity-50"
                >
                  {creating ? "Cr\u00e9ation\u2026" : "Cr\u00e9er"}
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
