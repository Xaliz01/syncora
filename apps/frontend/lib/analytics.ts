import type { AnalyticsSurface, TrackPageviewBody } from "@planwise/shared";
import { isPlatformMetricsExcludedEmail } from "@planwise/shared";
import { API_BASE, getAccessToken, getPlatformToken } from "@/lib/api-client";
import { isAppHost, isBackofficeHost, isLocalDevHost, isMarketingHost } from "@/lib/host-routing";
import { isLegalPath } from "@/lib/legal/routes";

export const ANALYTICS_VISITOR_KEY = "planwise_visitor_id";
export const ANALYTICS_SESSION_KEY = "planwise_session_id";
/** Mettre à `"1"` pour désactiver la mesure d'audience first-party. */
export const ANALYTICS_OPT_OUT_KEY = "planwise_analytics_opt_out";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

let lastTrackedKey: string | null = null;

export function isAnalyticsOptedOut(): boolean {
  if (typeof window === "undefined") return true;
  return window.localStorage.getItem(ANALYTICS_OPT_OUT_KEY) === "1";
}

function getOrCreateId(storage: Storage, key: string): string {
  const existing = storage.getItem(key);
  if (existing && UUID_RE.test(existing)) return existing;
  const id = crypto.randomUUID();
  storage.setItem(key, id);
  return id;
}

export function resolveAnalyticsSurface(pathname: string, hostname: string): AnalyticsSurface {
  const host = hostname.split(":")[0].toLowerCase();
  if (pathname === "/platform" || pathname.startsWith("/platform/") || isBackofficeHost(host)) {
    return "platform";
  }
  if (isMarketingHost(host)) return "marketing";
  if (isAppHost(host)) return "app";
  if (isLocalDevHost(host)) {
    if (pathname === "/" || isLegalPath(pathname)) return "marketing";
    return "app";
  }
  return "app";
}

function normalizePath(pathname: string): string {
  let path = pathname.trim() || "/";
  if (!path.startsWith("/")) path = `/${path}`;
  const q = path.indexOf("?");
  if (q >= 0) path = path.slice(0, q);
  const h = path.indexOf("#");
  if (h >= 0) path = path.slice(0, h);
  if (path.length > 1 && path.endsWith("/")) path = path.slice(0, -1);
  return path.slice(0, 200);
}

function referrerHost(): string | undefined {
  try {
    if (!document.referrer) return undefined;
    return new URL(document.referrer).hostname || undefined;
  } catch {
    return undefined;
  }
}

function emailDomainFromAddress(email?: string | null): string | undefined {
  const domain = email?.trim().toLowerCase().split("@")[1];
  return domain || undefined;
}

/**
 * @param options.userEmail — e-mail session app (AuthContext) pour exclure comptes internes / E2E
 */
export async function trackPageview(
  pathname: string,
  options?: { userEmail?: string | null },
): Promise<void> {
  if (typeof window === "undefined") return;
  if (isAnalyticsOptedOut()) return;

  const path = normalizePath(pathname);
  if (path === "/~offline") return;

  const surface = resolveAnalyticsSurface(path, window.location.hostname);
  // Pas de mesure backoffice.
  if (surface === "platform") return;

  const email = options?.userEmail?.trim() || null;
  if (email && isPlatformMetricsExcludedEmail(email)) return;
  // Session staff backoffice ouverte dans le même navigateur.
  if (getPlatformToken()) return;

  const dedupeKey = `${surface}:${path}`;
  if (lastTrackedKey === dedupeKey) return;
  lastTrackedKey = dedupeKey;

  const emailDomain = emailDomainFromAddress(email);
  const body: TrackPageviewBody = {
    surface,
    path,
    referrerHost: referrerHost(),
    visitorId: getOrCreateId(window.localStorage, ANALYTICS_VISITOR_KEY),
    sessionId: getOrCreateId(window.sessionStorage, ANALYTICS_SESSION_KEY),
    authenticated: Boolean(getAccessToken() || getPlatformToken()),
    ...(emailDomain ? { emailDomain } : {}),
  };

  try {
    await fetch(`${API_BASE}/analytics/pageview`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      keepalive: true,
      credentials: "omit",
    });
  } catch {
    /* ignore — ne pas casser la navigation */
  }
}
