"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth/AuthContext";
import { useOrganization } from "@/lib/organization";
import { hasPermission } from "@/lib/auth-permissions";
import { useToast } from "@/components/ui/ToastProvider";

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
  const [creating, setCreating] = useState(false);

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

  const handleCreateOrganization = async () => {
    const name = newOrgName.trim();
    if (!name) {
      showToast("Indiquez un nom d’organisation.", "error");
      return;
    }
    setCreating(true);
    try {
      await createOrganization({ name });
      setDialogOpen(false);
      setNewOrgName("");
      showToast("Organisation créée. Vous travaillez maintenant dans cet espace.");
      refetchOrganizations();
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Création impossible.", "error");
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

  const switcherId = variant === "gate" ? "syncora-org-switcher-gate" : "syncora-org-switcher";

  return (
    <div className={shellClass}>
      {variant === "gate" && (
        <p className="text-[11px] uppercase tracking-wide text-slate-400 dark:text-slate-500">
          Espace synchronisé
        </p>
      )}

      {variant === "gate" && organizations.length <= 1 && !isLoading ? (
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Organisation :{" "}
          <span className="font-medium text-slate-900 dark:text-white">
            {activeOrganization?.name ?? "—"}
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
            {isLoading && <option value={sessionOrganizationId}>Chargement…</option>}
            {!isLoading &&
              organizations.map((org) => (
                <option key={org.id} value={org.id}>
                  {org.name}
                </option>
              ))}
          </select>
          {variant === "gate" && organizations.length > 1 && (
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Basculez vers un autre espace si vous y avez déjà activé l’abonnement.
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

      {dialogOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-slate-950/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="syncora-new-org-title"
          onClick={() => {
            if (creating) return;
            setDialogOpen(false);
            setNewOrgName("");
          }}
        >
          <div
            className="w-full max-w-md rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xl p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <h2
              id="syncora-new-org-title"
              className="text-lg font-semibold text-slate-900 dark:text-slate-100"
            >
              Nouvelle organisation
            </h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Un espace distinct sera créé et votre session y sera associée (nouvelle organisation =
              nouvel abonnement à activer si besoin).
            </p>
            <label
              htmlFor="syncora-new-org-name"
              className="mt-4 block text-xs font-medium text-slate-600 dark:text-slate-300"
            >
              Nom
            </label>
            <input
              id="syncora-new-org-name"
              type="text"
              value={newOrgName}
              onChange={(e) => setNewOrgName(e.target.value)}
              placeholder="Ex. Ma société"
              className="mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-950 px-3 py-2 text-sm text-slate-900 dark:text-slate-100"
              disabled={creating}
              autoFocus
            />
            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setDialogOpen(false);
                  setNewOrgName("");
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
                {creating ? "Création…" : "Créer"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
