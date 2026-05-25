"use client";

import Link from "next/link";
import React from "react";
import type { ApiErrorVariant } from "@/lib/api-errors";
import { resolveErrorDisplay } from "@/lib/api-errors";

function cn(...parts: (string | false | undefined | null)[]): string {
  return parts.filter(Boolean).join(" ");
}

const VARIANT_STYLES: Record<ApiErrorVariant, { container: string; retryButton: string }> = {
  error: {
    container:
      "border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300",
    retryButton:
      "border-red-300 dark:border-red-800 text-red-800 dark:text-red-200 hover:bg-red-50 dark:hover:bg-red-950/40",
  },
  forbidden: {
    container:
      "border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-200",
    retryButton:
      "border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-100 hover:bg-amber-100/80 dark:hover:bg-amber-950/40",
  },
};

export function AppErrorAlert({
  error,
  message,
  fallbackMessage = "Une erreur est survenue.",
  variant,
  onRetry,
  className,
}: {
  error?: unknown;
  message?: string;
  fallbackMessage?: string;
  /** Force l’apparence (sinon déduite de `error`, ex. 403 → orange). */
  variant?: ApiErrorVariant;
  onRetry?: () => void;
  className?: string;
}) {
  const resolved =
    error !== undefined
      ? resolveErrorDisplay(error, fallbackMessage)
      : { message: message ?? fallbackMessage, variant: variant ?? ("error" as const) };
  const styles = VARIANT_STYLES[variant ?? resolved.variant];

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-3 rounded-lg border p-3 sm:p-4 text-sm",
        styles.container,
        className,
      )}
      role="alert"
    >
      <span>{resolved.message}</span>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className={cn(
            "rounded-lg border bg-white dark:bg-slate-900 px-3 py-1 text-xs font-medium",
            styles.retryButton,
          )}
        >
          Réessayer
        </button>
      ) : null}
    </div>
  );
}

/** État vide après chargement : erreur API (ex. 403) ou ressource absente. */
export function ResourceNotFoundPanel({
  error,
  resourceLabel,
  backHref,
  backLabel,
  onRetry,
}: {
  error?: unknown;
  resourceLabel: string;
  backHref: string;
  backLabel: string;
  onRetry?: () => void;
}) {
  return (
    <div className="space-y-3">
      {error ? (
        <AppErrorAlert error={error} onRetry={onRetry} />
      ) : (
        <p className="text-slate-700 dark:text-slate-200">{resourceLabel} introuvable.</p>
      )}
      <Link href={backHref} className="text-brand-600 dark:text-brand-400 hover:underline">
        {backLabel}
      </Link>
    </div>
  );
}
