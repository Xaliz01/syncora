import { getToken } from "./auth.api";

const API_BASE =
  (typeof process !== "undefined" && process.env.NEXT_PUBLIC_API_URL) ||
  "http://localhost:3000/api";

export interface SearchResultItem {
  id: string;
  type: "case" | "intervention" | "vehicle" | "technician" | "article" | "user";
  title: string;
  subtitle?: string;
  url: string;
}

export interface GlobalSearchResponse {
  query: string;
  results: SearchResultItem[];
  counts: Record<string, number>;
}

export async function globalSearch(query: string): Promise<GlobalSearchResponse> {
  const token = getToken();
  if (!token) throw new Error("Session expirée");

  const response = await fetch(
    `${API_BASE}/search?q=${encodeURIComponent(query)}`,
    {
      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  );

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    const message = (err as { message?: string | string[] }).message;
    if (Array.isArray(message)) throw new Error(message.join(", "));
    throw new Error(message ?? "Erreur API");
  }

  return response.json() as Promise<GlobalSearchResponse>;
}
