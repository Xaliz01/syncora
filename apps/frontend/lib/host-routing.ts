/** Hôte applicatif (connexion + PWA). Surchargé au build via NEXT_PUBLIC_APP_HOST. */
export const DEFAULT_APP_HOST = "app.planwise.fr";

/** Domaine marketing (landing). Surchargé au build via NEXT_PUBLIC_MARKETING_HOST. */
export const DEFAULT_MARKETING_HOST = "planwise.fr";

export function getConfiguredAppHost(): string {
  return process.env.NEXT_PUBLIC_APP_HOST?.trim() || DEFAULT_APP_HOST;
}

export function getConfiguredMarketingHost(): string {
  return process.env.NEXT_PUBLIC_MARKETING_HOST?.trim() || DEFAULT_MARKETING_HOST;
}

export function getMarketingHosts(): string[] {
  const root = getConfiguredMarketingHost();
  return [root, `www.${root}`];
}

export function getAppOrigin(): string {
  return `https://${getConfiguredAppHost()}`;
}

export function getMarketingOrigin(): string {
  return `https://${getConfiguredMarketingHost()}`;
}

/** Lien vers l'accueil marketing : `/` en dev local, domaine apex en prod. */
export function getMarketingHomeHref(hostname?: string): string {
  const host = hostname ?? (typeof window !== "undefined" ? window.location.hostname : "");
  if (host && isLocalDevHost(host)) {
    return "/";
  }
  return getMarketingOrigin();
}

export function isLocalDevHost(host: string): boolean {
  const normalized = host.split(":")[0].toLowerCase();
  return normalized === "localhost" || normalized === "127.0.0.1";
}

export function isMarketingHost(host: string): boolean {
  const normalized = host.split(":")[0].toLowerCase();
  if (isLocalDevHost(normalized)) return false;
  return getMarketingHosts().includes(normalized);
}

import { isLegalPath } from "@/lib/legal/routes";

export type HostRoutingResult =
  | { action: "next" }
  | { action: "redirect"; destination: string; permanent?: boolean };

/**
 * Règles de routage par hostname (prod) :
 * - planwise.fr / → landing ; autres chemins → app.planwise.fr
 * - www.planwise.fr → planwise.fr
 * - localhost → comportement dev inchangé
 */
export function resolveHostRouting(
  host: string,
  pathname: string,
  search: string,
): HostRoutingResult {
  const normalizedHost = host.split(":")[0].toLowerCase();

  if (isLocalDevHost(normalizedHost)) {
    return { action: "next" };
  }

  const marketingRoot = getConfiguredMarketingHost();
  const wwwHost = `www.${marketingRoot}`;

  if (normalizedHost === wwwHost) {
    return {
      action: "redirect",
      destination: `${getMarketingOrigin()}${pathname}${search}`,
      permanent: true,
    };
  }

  if (isMarketingHost(normalizedHost)) {
    if (pathname === "/" || isLegalPath(pathname)) {
      return { action: "next" };
    }
    return {
      action: "redirect",
      destination: `${getAppOrigin()}${pathname}${search}`,
      permanent: true,
    };
  }

  return { action: "next" };
}
