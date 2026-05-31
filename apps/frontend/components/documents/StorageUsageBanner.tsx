"use client";

import Link from "next/link";
import {
  formatStorageBytes,
  STORAGE_QUOTA_WARNING_RATIO,
  type OrganizationSubscriptionResponse,
} from "@syncora/shared";

type StorageUsageFields = Pick<
  OrganizationSubscriptionResponse,
  "storageUsedBytes" | "storageQuotaBytes" | "storageWarning"
>;

export function StorageUsageBanner({
  subscription,
  className = "",
  showManageLink = false,
}: {
  subscription: StorageUsageFields;
  className?: string;
  /** Lien vers la page abonnement pour augmenter le quota. */
  showManageLink?: boolean;
}) {
  const { storageUsedBytes, storageQuotaBytes, storageWarning } = subscription;
  const percent =
    storageQuotaBytes > 0
      ? Math.min(100, Math.round((storageUsedBytes / storageQuotaBytes) * 100))
      : 0;
  const atLimit = storageUsedBytes >= storageQuotaBytes;

  return (
    <div
      className={[
        "rounded-lg border px-3 py-2.5 text-sm",
        atLimit
          ? "border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/40 text-red-900 dark:text-red-100"
          : storageWarning
            ? "border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-100"
            : "border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      role="status"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
        <span className="font-medium">Espace documents</span>
        <span className="text-xs tabular-nums">
          {formatStorageBytes(storageUsedBytes)} / {formatStorageBytes(storageQuotaBytes)} (
          {percent}
          %)
        </span>
      </div>
      <div
        className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200/80 dark:bg-slate-700/80"
        aria-hidden
      >
        <div
          className={`h-full rounded-full transition-all ${
            atLimit ? "bg-red-500" : storageWarning ? "bg-amber-500" : "bg-brand-600"
          }`}
          style={{ width: `${percent}%` }}
        />
      </div>
      {storageWarning && (
        <p className="mt-2 text-xs leading-relaxed">
          {atLimit ? (
            <>
              Quota atteint — les nouveaux fichiers ne peuvent pas être ajoutés. Supprimez des
              documents ou augmentez votre stockage.
            </>
          ) : (
            <>
              Vous avez utilisé au moins {Math.round(STORAGE_QUOTA_WARNING_RATIO * 100)} % de votre
              espace documentaire.
            </>
          )}
          {showManageLink && (
            <>
              {" "}
              <Link
                href="/subscription"
                className="font-medium underline underline-offset-2 hover:no-underline"
              >
                Gérer l&apos;abonnement
              </Link>
            </>
          )}
        </p>
      )}
    </div>
  );
}
