/** Contrats mesure d'audience first-party (landing + app). */

export type AnalyticsSurface = "marketing" | "app" | "platform";

export interface TrackPageviewBody {
  surface: AnalyticsSurface;
  /** Chemin sans query ni hash (ex. `/cases`, `/`). */
  path: string;
  /** Hostname du referrer uniquement (ex. `google.com`), optionnel. */
  referrerHost?: string;
  /** Identifiant anonyme stable (UUID), localStorage. */
  visitorId: string;
  /** Identifiant de session navigateur (UUID), sessionStorage. */
  sessionId: string;
  /** true si une session app authentifiée est présente (sans userId). */
  authenticated?: boolean;
  /**
   * Rempli côté serveur uniquement (ISO 3166-1 alpha-2).
   * Ignoré / écrasé s'il est envoyé par le client.
   */
  country?: string;
  /**
   * Rempli côté serveur uniquement (code région approximatif).
   * Ignoré / écrasé s'il est envoyé par le client.
   */
  region?: string;
}

export interface TrackPageviewResponse {
  ok: true;
}

export interface AnalyticsDailyBucket {
  date: string;
  pageviews: number;
  visitors: number;
  sessions: number;
}

export interface AnalyticsPathStat {
  path: string;
  pageviews: number;
}

export interface AnalyticsSurfaceStat {
  surface: AnalyticsSurface;
  pageviews: number;
  visitors: number;
}

export interface AnalyticsCountryStat {
  country: string;
  pageviews: number;
  visitors: number;
}

export interface PlatformAnalyticsOverviewResponse {
  days: number;
  from: string;
  to: string;
  totals: {
    pageviews: number;
    visitors: number;
    sessions: number;
  };
  bySurface: AnalyticsSurfaceStat[];
  byDay: AnalyticsDailyBucket[];
  topPaths: AnalyticsPathStat[];
  topCountries: AnalyticsCountryStat[];
}

/** Visite individuelle de la landing marketing (`surface=marketing`, `path=/`). */
export interface PlatformLandingVisit {
  id: string;
  viewedAt: string;
  path: string;
  /** Prefixe du visitorId (stable navigateur) pour distinguer les visiteurs. */
  visitorKey: string;
  sessionKey: string;
  /** true si ce visitorId avait déjà visité la landing avant cette vue (sur la fenêtre). */
  isReturningVisitor: boolean;
  country?: string;
  region?: string;
  referrerHost?: string;
}

export interface PlatformLandingVisitsResponse {
  days: number;
  from: string;
  to: string;
  totals: {
    pageviews: number;
    visitors: number;
    sessions: number;
  };
  items: PlatformLandingVisit[];
  total: number;
  limit: number;
  offset: number;
}

/**
 * Visites app dont le referrer est la landing marketing
 * (passage planwise.fr → app.planwise.fr).
 * Même forme que les visites landing.
 */
export type PlatformLandingToAppVisitsResponse = PlatformLandingVisitsResponse;
