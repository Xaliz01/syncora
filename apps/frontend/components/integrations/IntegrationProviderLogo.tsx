import Image from "next/image";

const PROVIDERS = {
  pennylane: {
    type: "image" as const,
    src: "/integrations/pennylane.svg",
    alt: "Logo Pennylane",
    className: "object-contain p-1.5",
  },
  qonto: {
    type: "image" as const,
    src: "/integrations/qonto.png",
    alt: "Logo Qonto",
    className: "object-contain",
  },
  demo: {
    type: "badge" as const,
    label: "Démo",
  },
} as const;

type Provider = keyof typeof PROVIDERS;

export function IntegrationProviderLogo({
  provider,
  size = 40,
}: {
  provider: Provider;
  size?: number;
}) {
  const config = PROVIDERS[provider];
  if (config.type === "badge") {
    return (
      <span
        className="inline-flex shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-300 bg-slate-100 text-[10px] font-bold uppercase tracking-wide text-slate-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300"
        style={{ width: size, height: size }}
        aria-label="Facturation démo"
      >
        {config.label}
      </span>
    );
  }
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-600 dark:bg-white"
      style={{ width: size, height: size }}
    >
      <Image
        src={config.src}
        alt={config.alt}
        width={size}
        height={size}
        className={config.className}
      />
    </span>
  );
}
