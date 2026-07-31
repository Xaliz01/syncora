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
}
