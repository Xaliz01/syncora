/** Chemins publics des documents légaux (accessibles sur marketing et app). */
export const LEGAL_PATHS = [
  "/mentions-legales",
  "/politique-confidentialite",
  "/cgu",
  "/cgv",
  "/politique-cookies",
] as const;

export type LegalPath = (typeof LEGAL_PATHS)[number];

export function isLegalPath(pathname: string): boolean {
  return (LEGAL_PATHS as readonly string[]).includes(pathname);
}

export const LEGAL_NAV_LINKS: { href: LegalPath; label: string }[] = [
  { href: "/mentions-legales", label: "Mentions légales" },
  { href: "/politique-confidentialite", label: "Confidentialité" },
  { href: "/cgu", label: "CGU" },
  { href: "/cgv", label: "CGV" },
  { href: "/politique-cookies", label: "Cookies" },
];
