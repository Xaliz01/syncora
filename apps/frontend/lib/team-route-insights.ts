import type { AgenceResponse, PostalAddress, TeamResponse } from "@syncora/shared";

export type GeoPoint = { lon: number; lat: number };

const ROAD_FACTOR = 1.18; // vol d'oiseau → distance routière approximative
const AVG_SPEED_KMH = 44; // moyenne charge utile / périurbain
const LITERS_PER_100KM = 8.2; // utilitaire moyen
const CO2_KG_PER_LITER_DIESEL = 2.65; // ordre de grandeur (ACV)
/** Prix diesel professionnel indicatif TTC (€/L) — ordre de grandeur France ; à ajuster côté produit si besoin */
export const ESTIMATED_DIESEL_EUR_PER_LITER = 1.75;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Géocodage adresse France (Base Adresse Nationale) — pas de clé API. */
export async function geocodeAddressGouv(query: string): Promise<GeoPoint | null> {
  const q = query.trim();
  if (q.length < 3) return null;
  const url = `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(q)}&limit=1`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const data = (await res.json()) as {
    features?: Array<{ geometry?: { coordinates?: [number, number] } }>;
  };
  const coords = data.features?.[0]?.geometry?.coordinates;
  if (!coords || coords.length < 2) return null;
  return { lon: coords[0], lat: coords[1] };
}

export function haversineKm(a: GeoPoint, b: GeoPoint): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const sinDLat = Math.sin(dLat / 2);
  const sinDLon = Math.sin(dLon / 2);
  const h = sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLon * sinDLon;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function formatPostalAddress(addr: PostalAddress): string {
  const parts = [
    addr.line1,
    addr.line2,
    [addr.postalCode, addr.city].filter(Boolean).join(" "),
    addr.country && addr.country !== "FR" ? addr.country : ""
  ]
    .filter((p) => p && String(p).trim().length > 0)
    .map((p) => String(p).trim());
  return parts.join(", ");
}

function agenceToQuery(a: AgenceResponse): string {
  const parts = [a.address, [a.postalCode, a.city].filter(Boolean).join(" ")].filter(
    (p) => p && String(p).trim().length > 0
  );
  return parts.join(", ").trim();
}

export interface TeamRouteInsight {
  teamId: string;
  teamName: string;
  agenceId?: string;
  agenceLabel?: string;
  /** Distance routière estimée (km) */
  roadKm: number;
  driveMinutes: number;
  fuelLitersOneWay: number;
  /** Estimation du coût carburant aller (€), litres × prix indicatif */
  fuelCostEurOneWay: number;
  co2KgOneWay: number;
  score: number;
  rank: number;
  isTopPick: boolean;
  geocodeTeamOk: boolean;
  geocodeClientOk: boolean;
}

export interface RankTeamsResult {
  insights: TeamRouteInsight[];
  clientGeocodeOk: boolean;
  customerAddressSummary?: string;
}

/**
 * Classe les équipes par proximité estimée client ↔ agence de rattachement.
 * Respecte un léger espacement entre appels BAN pour usage raisonnable.
 */
export async function rankTeamsForCustomerSite(
  teams: TeamResponse[],
  agences: AgenceResponse[],
  customerAddress?: PostalAddress | null
): Promise<RankTeamsResult> {
  const empty: RankTeamsResult = {
    insights: [],
    clientGeocodeOk: false,
    customerAddressSummary: undefined
  };

  if (!teams.length) return empty;

  const addrStr = customerAddress ? formatPostalAddress(customerAddress) : "";
  if (!addrStr) {
    return {
      ...empty,
      customerAddressSummary: undefined
    };
  }

  const clientPoint = await geocodeAddressGouv(addrStr);
  const clientGeocodeOk = !!clientPoint;

  const agenceById = new Map(agences.map((a) => [a.id, a]));
  const agencePointCache = new Map<string, GeoPoint | null>();

  for (const a of agences) {
    const q = agenceToQuery(a);
    if (!q) {
      agencePointCache.set(a.id, null);
      continue;
    }
    const pt = await geocodeAddressGouv(q);
    agencePointCache.set(a.id, pt);
    await sleep(35);
  }

  const raw: Omit<TeamRouteInsight, "rank" | "isTopPick" | "score">[] = [];

  for (const t of teams) {
    const ag = t.agenceId ? agenceById.get(t.agenceId) : undefined;
    const agLabel = ag?.name ?? t.agenceName;
    let geocodeTeamOk = false;
    let roadKm = 999;

    if (clientPoint && t.agenceId) {
      const apt = agencePointCache.get(t.agenceId);
      if (apt) {
        const bird = haversineKm(clientPoint, apt);
        roadKm = bird * ROAD_FACTOR;
        geocodeTeamOk = true;
      }
    }

    const driveMinutes = roadKm > 0 && roadKm < 900 ? (roadKm / AVG_SPEED_KMH) * 60 : 0;
    const fuelLitersOneWay =
      roadKm > 0 && roadKm < 900 ? roadKm * (LITERS_PER_100KM / 100) : 0;
    const co2KgOneWay = fuelLitersOneWay * CO2_KG_PER_LITER_DIESEL;
    const fuelCostEurOneWay = fuelLitersOneWay * ESTIMATED_DIESEL_EUR_PER_LITER;

    raw.push({
      teamId: t.id,
      teamName: t.name,
      agenceId: t.agenceId,
      agenceLabel: agLabel,
      roadKm: Math.round(roadKm * 10) / 10,
      driveMinutes: Math.round(driveMinutes),
      fuelLitersOneWay: Math.round(fuelLitersOneWay * 100) / 100,
      fuelCostEurOneWay: Math.round(fuelCostEurOneWay * 100) / 100,
      co2KgOneWay: Math.round(co2KgOneWay * 100) / 100,
      geocodeTeamOk,
      geocodeClientOk: clientGeocodeOk
    });
  }

  const validDistances = raw.filter((r) => r.geocodeTeamOk && r.roadKm < 900).map((r) => r.roadKm);
  const maxKm = validDistances.length ? Math.max(...validDistances) : 1;

  const scored = raw.map((r) => {
    let score = 50;
    if (r.geocodeTeamOk && clientGeocodeOk) {
      score = Math.round(100 - (r.roadKm / maxKm) * 55);
      score = Math.max(15, Math.min(100, score));
    }
    return { ...r, score };
  });

  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.roadKm - b.roadKm;
  });

  const insights: TeamRouteInsight[] = scored.map((r, index) => ({
    ...r,
    rank: index + 1,
    isTopPick: index === 0 && r.geocodeTeamOk && clientGeocodeOk
  }));

  return {
    insights,
    clientGeocodeOk,
    customerAddressSummary: addrStr
  };
}
