import type { APIRequestContext } from "@playwright/test";

/** Base API (même défaut que `lib/api-client.ts`). */
export function apiBaseUrl(): string {
  return (process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api").replace(/\/$/, "");
}

/**
 * Les specs `*.live.spec.ts` ne tournent que si `E2E_LIVE=1` et que la gateway répond.
 * En CI (frontend seul) elles sont skippées via `test.skip` dans la spec.
 */
export async function assertLiveBackendReachable(request: APIRequestContext): Promise<void> {
  const res = await request.get(`${apiBaseUrl()}/auth/me`, { timeout: 5_000 });
  // 401 = gateway up sans session ; 5xx = indisponible
  if (res.status() >= 500) {
    throw new Error(`API indisponible (HTTP ${res.status()})`);
  }
}
