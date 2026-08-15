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
   * Domaine e-mail de l’utilisateur connecté (ex. `exemple.fr`), sans la partie locale.
   * Sert à exclure les comptes internes / E2E des stats audience.
   */
  emailDomain?: string;
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

/** Visite récente pour le tableau de bord backoffice (même forme que landing). */
export type PlatformDashboardVisit = PlatformLandingVisit;

/** Connexion applicative récente (champ `lastLoginAt` utilisateur). */
export interface PlatformDashboardRecentLogin {
  userId: string;
  email: string;
  name?: string;
  organizationId?: string;
  organizationName?: string;
  lastLoginAt: string;
}

export interface PlatformDashboardResponse {
  /** Organisations hors e-mails @benoistbabin.fr / @planwise.fr / @planwise.test. */
  organizationCount: number;
  /** Utilisateurs hors e-mails de test. */
  userCount: number;
  /** Utilisateurs avec activité session récente (hors e-mails de test). */
  connectedUserCount: number;
  /** Essais en cours (trialing + fin d’essai dans le futur), hors orgs de test. */
  activeTrialCount: number;
  /** Abonnements payants (active / past_due), hors orgs de test. */
  subscriberCount: number;
  /** 10 dernières connexions app (hors e-mails de test). */
  recentLogins: PlatformDashboardRecentLogin[];
  recentLandingVisits: PlatformDashboardVisit[];
  recentLoginVisits: PlatformDashboardVisit[];
  recentRegisterVisits: PlatformDashboardVisit[];
}
