import type { APIRequestContext, APIResponse } from "@playwright/test";

export const MARKETING_HOST = "planwise.fr";
export const APP_HOST = "app.planwise.fr";
export const WWW_HOST = "www.planwise.fr";

/** Requiert des entrées /etc/hosts : 127.0.0.1 planwise.fr app.planwise.fr */
export const MARKETING_BASE = `http://${MARKETING_HOST}:5173`;
export const APP_BASE = `http://${APP_HOST}:5173`;
const LOCAL_BASE = "http://localhost:5173";

export function marketingUrl(path: string): string {
  return `${MARKETING_BASE}${path}`;
}

export function appUrl(path: string): string {
  return `${APP_BASE}${path}`;
}

/** Requête HTTP avec en-tête Host (tests middleware sans résolution DNS locale). */
export function requestWithHost(
  request: APIRequestContext,
  path: string,
  host: string,
  options?: { maxRedirects?: number },
): Promise<APIResponse> {
  return request.get(`${LOCAL_BASE}${path}`, {
    headers: { Host: host },
    maxRedirects: options?.maxRedirects ?? 0,
  });
}

export function marketingOrigin(): string {
  return `https://${MARKETING_HOST}`;
}

export function appOrigin(): string {
  return `https://${APP_HOST}`;
}

/** Vérifie que planwise.fr:5173 pointe vers le serveur de test local. */
export async function isLocalHostRoutingReady(request: APIRequestContext): Promise<boolean> {
  try {
    const response = await request.get(marketingUrl("/"), { timeout: 5_000 });
    return response.status() === 200;
  } catch {
    return false;
  }
}
