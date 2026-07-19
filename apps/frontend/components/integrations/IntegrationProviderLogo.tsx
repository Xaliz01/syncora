import Image from "next/image";

const PROVIDERS = {
  pennylane: {
    src: "/integrations/pennylane.png",
    alt: "Logo Pennylane",
  },
  qonto: {
    src: "/integrations/qonto.svg",
    alt: "Logo Qonto",
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
  const { src, alt } = PROVIDERS[provider];
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-600 dark:bg-white"
      style={{ width: size, height: size }}
    >
      <Image
        src={src}
        alt={alt}
        width={size}
        height={size}
        className={provider === "qonto" ? "object-contain p-2" : "object-contain"}
      />
    </span>
  );
}
