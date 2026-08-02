"use client";

type ServiceUnavailablePageProps = {
  title?: string;
  description?: string;
  onRetry?: () => void;
  /** Digest Next.js (debug), affiché seulement en développement. */
  digest?: string;
};

/**
 * Écran de secours (erreur React / indisponibilité) — aligné sur le design Planwise.
 */
export function ServiceUnavailablePage({
  title = "Maintenance en cours",
  description = "Planwise est temporairement indisponible pour maintenance. Merci de réessayer dans quelques instants.",
  onRetry,
  digest,
}: ServiceUnavailablePageProps) {
  const handleRetry = () => {
    if (onRetry) {
      onRetry();
      return;
    }
    window.location.reload();
  };

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-slate-50 px-4 py-16 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(67,56,202,0.18),_transparent_55%)] dark:bg-[radial-gradient(ellipse_at_top,_rgba(67,56,202,0.28),_transparent_55%)]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-24 left-1/2 h-64 w-[36rem] -translate-x-1/2 rounded-full bg-brand-600/10 blur-3xl dark:bg-brand-600/20"
        aria-hidden
      />

      <div className="relative z-10 flex w-full max-w-md flex-col items-center text-center">
        <div className="mb-6 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-600 text-xl font-semibold text-white shadow-lg shadow-brand-600/30">
          P
        </div>
        <p className="mb-2 text-sm font-semibold tracking-wide text-brand-600 dark:text-brand-400">
          Planwise
        </p>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-50 sm:text-3xl">
          {title}
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-400 sm:text-base">
          {description}
        </p>

        <button
          type="button"
          onClick={handleRetry}
          className="mt-8 inline-flex items-center justify-center rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm shadow-brand-600/20 transition hover:bg-brand-500"
        >
          Réessayer
        </button>

        {digest && process.env.NODE_ENV === "development" ? (
          <p className="mt-6 max-w-full truncate font-mono text-xs text-slate-400" title={digest}>
            digest: {digest}
          </p>
        ) : null}
      </div>
    </div>
  );
}
