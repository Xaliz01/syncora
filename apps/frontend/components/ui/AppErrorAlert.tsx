"use client";

import Link from "next/link";
import React from "react";
import type { ApiErrorVariant } from "@/lib/api-errors";
import { isApiErrorForbidden, isApiErrorNotFound, resolveErrorDisplay } from "@/lib/api-errors";
import { isCrispEnabled, openCrispChat } from "@/lib/crisp-client";

function cn(...parts: (string | false | undefined | null)[]): string {
  return parts.filter(Boolean).join(" ");
}

const VARIANT_STYLES: Record<
  Exclude<ApiErrorVariant, "not_found">,
  { container: string; retryButton: string }
> = {
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
  variant?: Exclude<ApiErrorVariant, "not_found">;
  onRetry?: () => void;
  className?: string;
}) {
  const resolved =
    error !== undefined
      ? resolveErrorDisplay(error, fallbackMessage)
      : { message: message ?? fallbackMessage, variant: variant ?? ("error" as const) };
  const displayVariant: Exclude<ApiErrorVariant, "not_found"> =
    variant ?? (resolved.variant === "not_found" ? "error" : resolved.variant);
  const styles = VARIANT_STYLES[displayVariant];

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

function MissingResourceIllustration() {
  return (
    <div
      className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 shadow-inner dark:bg-slate-800 dark:text-slate-500"
      aria-hidden
    >
      <svg
        className="h-10 w-10"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m5.231 13.481L15 17.25m-4.5-15H5.625c-.621 0-1.125.504-1.125 1.125v16.5c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9zm3.75 11.625a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"
        />
      </svg>
    </div>
  );
}

/** État vide après chargement : ressource absente (404) ou erreur API (ex. 403). */
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
  const missing = !error || isApiErrorNotFound(error);
  const forbidden = isApiErrorForbidden(error);
  const canOpenChat = isCrispEnabled();

  if (!missing && !forbidden && error) {
    return (
      <div className="space-y-3">
        <AppErrorAlert error={error} onRetry={onRetry} />
        <Link href={backHref} className="text-brand-600 dark:text-brand-400 hover:underline">
          {backLabel}
        </Link>
      </div>
    );
  }

  if (forbidden) {
    return (
      <div className="space-y-3">
        <AppErrorAlert error={error} onRetry={onRetry} />
        <Link href={backHref} className="text-brand-600 dark:text-brand-400 hover:underline">
          {backLabel}
        </Link>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white px-6 py-10 text-center shadow-sm dark:border-slate-700 dark:bg-slate-900 sm:px-10">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(67,56,202,0.08),_transparent_55%)] dark:bg-[radial-gradient(ellipse_at_top,_rgba(67,56,202,0.14),_transparent_55%)]"
        aria-hidden
      />
      <div className="relative z-10 mx-auto max-w-md">
        <MissingResourceIllustration />
        <h1 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">
          {resourceLabel} introuvable
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
          Cette fiche n’existe pas, a été supprimée, ou le lien n’est plus valide.
        </p>
        <p className="mt-2 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
          Si vous pensez qu’il s’agit d’une erreur, contactez le support — on vous aidera à y voir
          clair.
        </p>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Link
            href={backHref}
            className="inline-flex items-center justify-center rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-500"
          >
            {backLabel}
          </Link>
          {canOpenChat ? (
            <button
              type="button"
              onClick={() => openCrispChat()}
              className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              Contacter le support
            </button>
          ) : null}
          {onRetry ? (
            <button
              type="button"
              onClick={onRetry}
              className="inline-flex items-center justify-center rounded-lg px-3 py-2.5 text-sm font-medium text-slate-500 underline-offset-2 hover:underline dark:text-slate-400"
            >
              Réessayer
            </button>
          ) : null}
        </div>

        {!canOpenChat ? (
          <p className="mt-4 text-xs text-slate-500 dark:text-slate-400">
            Utilisez le chat en bas à droite de l’écran si le support est disponible.
          </p>
        ) : null}
      </div>
    </div>
  );
}
