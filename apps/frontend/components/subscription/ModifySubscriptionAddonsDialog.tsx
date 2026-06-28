"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  ADDON_CATALOG,
  BASE_SUBSCRIPTION_INCLUDED_USERS,
  BASE_SUBSCRIPTION_PLAN,
  BOOLEAN_CROSS_SELL_ADDON_CODES,
  QUANTITY_CROSS_SELL_ADDON_CODES,
  computeMaxOrganizationUsers,
  computeOrganizationStorageQuotaBytes,
  formatStorageBytes,
  isBooleanAddonCode,
  sanitizeAddonQuantities,
  type AddonCode,
  type AddonQuantities,
  type BooleanAddonCode,
  type OrganizationSubscriptionResponse,
  type QuantityAddonCode,
} from "@planwise/shared";
import * as subscriptionsApi from "@/lib/subscriptions.api";
import {
  isExternalSubscriptionPaymentUrl,
  waitForSubscriptionAddonsSync,
} from "@/lib/subscription-sync";
import { useToast } from "@/components/ui/ToastProvider";

function quantityAddonHint(code: QuantityAddonCode, quantities: AddonQuantities): string {
  if (code === "extra_users") {
    const maxUsers = computeMaxOrganizationUsers(quantities);
    return `Jusqu’à ${maxUsers} utilisateur${maxUsers > 1 ? "s" : ""} au total.`;
  }
  const quota = computeOrganizationStorageQuotaBytes(quantities);
  return `Quota documentaire : ${formatStorageBytes(quota)} au total.`;
}

export function ModifySubscriptionAddonsDialog({
  open,
  onClose,
  subscription,
  onApplied,
  preselectAddon,
  canApplyChanges = true,
}: {
  open: boolean;
  onClose: () => void;
  subscription: OrganizationSubscriptionResponse;
  onApplied: () => void;
  /** Addon à cocher à l’ouverture (ex. depuis un module verrouillé). */
  preselectAddon?: AddonCode;
  /** False si l’abonnement socle n’est pas encore actif. */
  canApplyChanges?: boolean;
}) {
  const { showToast } = useToast();
  const [selectedBoolean, setSelectedBoolean] = useState<BooleanAddonCode[]>(
    subscription.activeAddons.filter(isBooleanAddonCode),
  );
  const [quantityAddons, setQuantityAddons] = useState<AddonQuantities>(
    sanitizeAddonQuantities(subscription.addonQuantities),
  );

  useEffect(() => {
    if (open) {
      const next = [...subscription.activeAddons];
      if (preselectAddon && !next.includes(preselectAddon)) {
        next.push(preselectAddon);
      }
      setSelectedBoolean(next.filter(isBooleanAddonCode));
      setQuantityAddons(sanitizeAddonQuantities(subscription.addonQuantities));
    }
  }, [open, subscription.activeAddons, subscription.addonQuantities, preselectAddon]);

  const hasChanges = useMemo(() => {
    const currentBoolean = [...subscription.activeAddons].sort().join(",");
    const nextBoolean = [...selectedBoolean].sort().join(",");
    const currentQty = sanitizeAddonQuantities(subscription.addonQuantities);
    const nextQty = sanitizeAddonQuantities(quantityAddons);
    const qtyChanged = QUANTITY_CROSS_SELL_ADDON_CODES.some(
      (code) => (currentQty[code] ?? 0) !== (nextQty[code] ?? 0),
    );
    return currentBoolean !== nextBoolean || qtyChanged;
  }, [selectedBoolean, subscription.activeAddons, subscription.addonQuantities, quantityAddons]);

  const updateMutation = useMutation({
    mutationFn: async () => {
      const sanitized = sanitizeAddonQuantities(quantityAddons);
      const origin = window.location.origin;
      const res = await subscriptionsApi.updateSubscriptionAddons({
        addonCodes: selectedBoolean,
        addonQuantities: sanitized,
        successUrl: `${origin}/subscription?checkout=success`,
      });

      if (res.url && isExternalSubscriptionPaymentUrl(res.url)) {
        return { res, redirectToPayment: true as const };
      }

      const synced = await waitForSubscriptionAddonsSync({
        booleanAddons: selectedBoolean,
        addonQuantities: sanitized,
      });
      return { res, redirectToPayment: false as const, synced };
    },
    onSuccess: ({ res, redirectToPayment, synced }) => {
      if (redirectToPayment && res.url) {
        window.location.href = res.url;
        return;
      }

      if (synced) {
        showToast("Abonnement mis à jour.");
      } else {
        showToast(
          "Options enregistrées chez Stripe. L’affichage peut se mettre à jour dans quelques instants.",
        );
      }
      onApplied();
      onClose();
    },
    onError: (err: Error) => {
      showToast(err.message ?? "Impossible de modifier les options.", "error");
    },
  });

  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modify-subscription-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
        aria-label="Fermer"
        onClick={onClose}
        disabled={updateMutation.isPending}
      />
      <div className="relative w-full max-w-lg rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xl p-5 sm:p-6 max-h-[min(90vh,40rem)] overflow-y-auto">
        <h2
          id="modify-subscription-title"
          className="text-lg font-semibold text-slate-900 dark:text-slate-100"
        >
          Modifier l’abonnement
        </h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Cochez les options à conserver sur votre offre {subscription.planName}. Pour les options à
          quantité, indiquez le nombre de packs souhaité.
        </p>

        {!canApplyChanges && (
          <p className="mt-4 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 px-3 py-2 text-sm text-amber-900 dark:text-amber-100">
            Activez d’abord l’abonnement {subscription.planName} sur cette page, puis enregistrez
            vos options.
          </p>
        )}

        <ul className="mt-5 space-y-3">
          {BOOLEAN_CROSS_SELL_ADDON_CODES.map((code) => {
            const addon = ADDON_CATALOG[code];
            const checked = selectedBoolean.includes(code);
            return (
              <li key={code}>
                <label className="flex cursor-pointer gap-3 rounded-xl border border-slate-200 dark:border-slate-700 p-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand-500">
                  <input
                    type="checkbox"
                    className="mt-1 h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                    checked={checked}
                    disabled={updateMutation.isPending}
                    onChange={() => {
                      setSelectedBoolean((prev) =>
                        checked ? prev.filter((c) => c !== code) : [...prev, code],
                      );
                    }}
                  />
                  <span className="min-w-0">
                    <span className="block text-sm font-medium text-slate-900 dark:text-slate-100">
                      {addon.label}
                    </span>
                    <span className="block text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {addon.priceLabel}
                    </span>
                    <span className="block text-xs text-slate-600 dark:text-slate-300 mt-1">
                      {addon.pitch}
                    </span>
                  </span>
                </label>
              </li>
            );
          })}

          {QUANTITY_CROSS_SELL_ADDON_CODES.map((code) => {
            const addon = ADDON_CATALOG[code];
            const qty = quantityAddons[code] ?? 0;
            const hintQuantities = sanitizeAddonQuantities({ ...quantityAddons, [code]: qty });
            return (
              <li key={code}>
                <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-3">
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                    {addon.label}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {addon.priceLabel}
                  </p>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">{addon.pitch}</p>
                  {code === "extra_users" && (
                    <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                      {BASE_SUBSCRIPTION_INCLUDED_USERS} utilisateurs inclus dans l’offre{" "}
                      {BASE_SUBSCRIPTION_PLAN.name}.
                    </p>
                  )}
                  <label className="mt-3 flex items-center gap-3">
                    <span className="text-sm text-slate-700 dark:text-slate-200 shrink-0">
                      {code === "extra_storage" ? "Packs (+50 Go)" : "Supplémentaires"}
                    </span>
                    <input
                      type="number"
                      min={0}
                      step={1}
                      value={qty}
                      disabled={updateMutation.isPending}
                      onChange={(event) => {
                        const parsed = Number.parseInt(event.target.value, 10);
                        setQuantityAddons((prev) =>
                          sanitizeAddonQuantities({
                            ...prev,
                            [code]: Number.isFinite(parsed) ? Math.max(0, parsed) : 0,
                          }),
                        );
                      }}
                      className="w-24 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-sm"
                    />
                  </label>
                  <p className="mt-2 text-xs text-brand-600 dark:text-brand-400">
                    {quantityAddonHint(code, hintQuantities)}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>

        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={updateMutation.isPending}
            className="rounded-lg border border-slate-200 dark:border-slate-700 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 transition"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={() => updateMutation.mutate()}
            disabled={!canApplyChanges || !hasChanges || updateMutation.isPending}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-500 disabled:opacity-50 transition"
          >
            {updateMutation.isPending ? (
              <>
                <span
                  className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white"
                  aria-hidden
                />
                Synchronisation…
              </>
            ) : (
              "Enregistrer les options"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
