import type { PostalAddress } from "@syncora/shared";

const BAN_SEARCH = "https://api-adresse.data.gouv.fr/search/";

export interface BanFeatureProperties {
  label: string;
  name?: string;
  housenumber?: string;
  street?: string;
  postcode?: string;
  city?: string;
  /** Score de correspondance 0–1 */
  score?: number;
  type?: string;
}

export interface BanFeature {
  properties: BanFeatureProperties;
  geometry?: { type: string; coordinates?: [number, number] };
}

export interface BanSearchResponse {
  features?: BanFeature[];
}

/** Transforme une feature BAN en adresse postale structurée (France). */
export function banFeatureToPostalAddress(feature: BanFeature): PostalAddress {
  const p = feature.properties;
  const line1 =
    [p.housenumber, p.street].filter(Boolean).join(" ").trim() ||
    p.name?.trim() ||
    p.label?.split(",")[0]?.trim() ||
    "";
  return {
    line1,
    line2: undefined,
    postalCode: (p.postcode ?? "").trim(),
    city: (p.city ?? "").trim(),
    country: "FR",
  };
}

export async function searchBanAddresses(query: string, limit = 8): Promise<BanFeature[]> {
  const q = query.trim();
  if (q.length < 3) return [];
  const url = `${BAN_SEARCH}?q=${encodeURIComponent(q)}&limit=${limit}`;
  const res = await fetch(url);
  if (!res.ok) return [];
  const data = (await res.json()) as BanSearchResponse;
  return data.features ?? [];
}
