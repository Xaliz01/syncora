/** Badge discret pour signaler la phase beta (landing, abonnement). */
export function BetaBadge({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-md border border-amber-300/80 dark:border-amber-600/50 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-800 dark:text-amber-200 ${className}`}
    >
      Beta
    </span>
  );
}
