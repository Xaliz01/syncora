import Image from "next/image";
import { PLANWISE_LOGO_SRC } from "@/lib/brand-assets";

const SIZE = {
  sm: { box: "h-8 w-8", logo: 22, ring: "border-2" },
  md: { box: "h-11 w-11", logo: 30, ring: "border-2" },
  lg: { box: "h-14 w-14", logo: 40, ring: "border-[3px]" },
} as const;

function cn(...parts: (string | false | undefined | null)[]): string {
  return parts.filter(Boolean).join(" ");
}

/**
 * Indicateur de chargement brandé : logo Planwise + anneau.
 */
export function PlanwiseLoader({
  size = "md",
  label,
  className,
  ariaLabel = "Chargement",
}: {
  size?: keyof typeof SIZE;
  /** Texte sous le logo (ex. « Chargement… »). */
  label?: string;
  className?: string;
  ariaLabel?: string;
}) {
  const s = SIZE[size];
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label={ariaLabel}
      className={cn("inline-flex flex-col items-center gap-3", className)}
    >
      <div className={cn("relative flex items-center justify-center", s.box)} aria-hidden>
        <div
          className={cn(
            "absolute inset-0 rounded-full border-brand-200/80 dark:border-brand-500/35 border-t-brand-600 dark:border-t-brand-400 animate-spin",
            s.ring,
          )}
        />
        <Image
          src={PLANWISE_LOGO_SRC}
          alt=""
          width={s.logo}
          height={s.logo}
          className="relative animate-planwise-loader-breathe"
          priority={size === "lg"}
        />
      </div>
      {label ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">{label}</p>
      ) : (
        <span className="sr-only">{ariaLabel}</span>
      )}
    </div>
  );
}
