export const API_BASE =
  (typeof process !== "undefined" && process.env.NEXT_PUBLIC_API_URL) ||
  "http://localhost:3000/api";

export type ApiMethod = "GET" | "POST" | "PATCH" | "PUT" | "DELETE";

export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("syncora_access_token");
}

export interface ApiRequestOptions {
  body?: unknown;
  /** When true (default), sends Bearer token and requires a session. */
  bearer?: boolean;
  /** When bearer is true and there is no token */
  noTokenMessage?: string;
  /** When response is not OK and body has no usable message */
  fallbackError?: string;
}

async function throwIfNotOk(response: Response, fallbackError: string): Promise<void> {
  if (response.ok) return;
  const err = await response.json().catch(() => ({}));
  const message = (err as { message?: string | string[] }).message;
  if (Array.isArray(message)) throw new Error(message.join(", "));
  throw new Error(message ?? fallbackError);
}

export async function apiRequestJson<T>(
  method: ApiMethod,
  path: string,
  options: ApiRequestOptions = {},
): Promise<T> {
  const {
    body,
    bearer = true,
    noTokenMessage = "Session expirée",
    fallbackError = "Erreur API",
  } = options;

  const headers: Record<string, string> = {};

  if (bearer) {
    const token = getAccessToken();
    if (!token) throw new Error(noTokenMessage);
    headers.Authorization = `Bearer ${token}`;
  }

  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  await throwIfNotOk(response, fallbackError);
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}
