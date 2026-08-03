import Image from "next/image";

const PROVIDERS = {
  pennylane: {
    src: "/integrations/pennylane.svg",
    alt: "Logo Pennylane",
    className: "object-contain p-1.5",
  },
  qonto: {
    src: "/integrations/qonto.png",
    alt: "Logo Qonto",
    className: "object-contain",
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
  const { src, alt, className } = PROVIDERS[provider];
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-600 dark:bg-white"
      style={{ width: size, height: size }}
    >
      <Image src={src} alt={alt} width={size} height={size} className={className} />
    </span>
  );
}
