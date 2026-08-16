import { PlanwiseLoader } from "@/components/ui/PlanwiseLoader";

/** Fallback Suspense / page pleine hauteur. */
export function PageLoadingFallback({ label = "Chargement…" }: { label?: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
      <PlanwiseLoader size="lg" label={label} />
    </div>
  );
}
