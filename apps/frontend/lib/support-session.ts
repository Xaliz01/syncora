import { getAppOrigin, isLocalDevHost } from "@/lib/host-routing";

/**
 * Transfert de session support cross-domaine.
 * localStorage n’est pas partagé entre backoffice.* et app.* :
 * on passe le JWT via le fragment URL (jamais envoyé au serveur).
 */
export function buildSupportSessionHandoffUrl(accessToken: string): string {
  const host = typeof window !== "undefined" ? window.location.hostname : "";
  const base = isLocalDevHost(host) ? "" : getAppOrigin();
  return `${base}/auth/support-session#access_token=${encodeURIComponent(accessToken)}`;
}

export function readSupportSessionTokenFromHash(): string | null {
  if (typeof window === "undefined") return null;
  const raw = window.location.hash.replace(/^#/, "");
  if (!raw) return null;
  const params = new URLSearchParams(raw);
  return params.get("access_token");
}

export function clearSupportSessionHash(): void {
  if (typeof window === "undefined") return;
  const { pathname, search } = window.location;
  window.history.replaceState(null, "", `${pathname}${search}`);
}
