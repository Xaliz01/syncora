import type {
  AuthResponse,
  CronRunsListResponse,
  PlatformAnalyticsOverviewResponse,
  PlatformLandingVisitsResponse,
  PlatformAuthResponse,
  PlatformAuthUser,
  PlatformCronJobsOverviewResponse,
  PlatformIntegrationsListResponse,
  PlatformOrganizationDetailResponse,
  PlatformOrganizationsListResponse,
  PlatformProspectCreditsResponse,
  PlatformProspectEmailNotFoundBody,
  PlatformProspectNoteBody,
  PlatformProspectOutreachBody,
  PlatformProspectOutreachResponse,
  PlatformProspectsSearchResponse,
  ProspectOutreachesListResponse,
  PlatformUsersListResponse,
  StartImpersonationBody,
} from "@planwise/shared";
import { apiRequestJson, getPlatformToken } from "./api-client";

const PLATFORM_TOKEN_KEY = "planwise_platform_token";

export function setPlatformToken(token: string) {
  if (typeof window !== "undefined") {
    localStorage.setItem(PLATFORM_TOKEN_KEY, token);
  }
}

export function clearPlatformToken() {
  if (typeof window !== "undefined") {
    localStorage.removeItem(PLATFORM_TOKEN_KEY);
  }
}

export function getStoredPlatformToken() {
  return getPlatformToken();
}

export async function platformLogin(email: string, password: string) {
  return apiRequestJson<PlatformAuthResponse>("POST", "/platform/login", {
    body: { email, password },
    bearer: false,
    fallbackError: "Connexion backoffice impossible",
  });
}

export async function platformMe() {
  return apiRequestJson<PlatformAuthUser>("GET", "/platform/me", {
    platformBearer: true,
    noTokenMessage: "Session backoffice expirée",
    fallbackError: "Session backoffice expirée",
  });
}

export async function listPlatformOrganizations(filters?: {
  search?: string;
  limit?: number;
  offset?: number;
}) {
  const params = new URLSearchParams();
  if (filters?.search) params.set("search", filters.search);
  if (filters?.limit != null) params.set("limit", String(filters.limit));
  if (filters?.offset != null) params.set("offset", String(filters.offset));
  const qs = params.toString();
  return apiRequestJson<PlatformOrganizationsListResponse>(
    "GET",
    `/platform/organizations${qs ? `?${qs}` : ""}`,
    {
      platformBearer: true,
      fallbackError: "Impossible de charger les organisations",
    },
  );
}

export async function getPlatformOrganization(organizationId: string) {
  return apiRequestJson<PlatformOrganizationDetailResponse>(
    "GET",
    `/platform/organizations/${organizationId}`,
    {
      platformBearer: true,
      fallbackError: "Impossible de charger l’organisation",
    },
  );
}

export async function staffExtendOrganizationTrial(organizationId: string) {
  return apiRequestJson<NonNullable<PlatformOrganizationDetailResponse["subscription"]>>(
    "POST",
    `/platform/organizations/${organizationId}/extend-trial`,
    {
      platformBearer: true,
      fallbackError: "Impossible de prolonger l’essai",
    },
  );
}

export async function listPlatformUsers(filters?: {
  search?: string;
  organizationId?: string;
  limit?: number;
  offset?: number;
}) {
  const params = new URLSearchParams();
  if (filters?.search) params.set("search", filters.search);
  if (filters?.organizationId) params.set("organizationId", filters.organizationId);
  if (filters?.limit != null) params.set("limit", String(filters.limit));
  if (filters?.offset != null) params.set("offset", String(filters.offset));
  const qs = params.toString();
  return apiRequestJson<PlatformUsersListResponse>("GET", `/platform/users${qs ? `?${qs}` : ""}`, {
    platformBearer: true,
    fallbackError: "Impossible de charger les utilisateurs",
  });
}

export async function startImpersonation(body: StartImpersonationBody) {
  return apiRequestJson<AuthResponse>("POST", "/platform/impersonate", {
    body,
    platformBearer: true,
    fallbackError: "Impossible de démarrer la session support",
  });
}

export async function listPlatformIntegrations(filters?: {
  provider?: string;
  organizationId?: string;
  limit?: number;
  offset?: number;
}) {
  const params = new URLSearchParams();
  if (filters?.provider) params.set("provider", filters.provider);
  if (filters?.organizationId) params.set("organizationId", filters.organizationId);
  if (filters?.limit != null) params.set("limit", String(filters.limit));
  if (filters?.offset != null) params.set("offset", String(filters.offset));
  const qs = params.toString();
  return apiRequestJson<PlatformIntegrationsListResponse>(
    "GET",
    `/platform/integrations${qs ? `?${qs}` : ""}`,
    {
      platformBearer: true,
      fallbackError: "Impossible de charger les intégrations",
    },
  );
}

export async function getPlatformCronJobs() {
  return apiRequestJson<PlatformCronJobsOverviewResponse>("GET", "/platform/cron-jobs", {
    platformBearer: true,
    fallbackError: "Impossible de charger les crons",
  });
}

export async function listPlatformCronRuns(filters?: {
  jobKey?: string;
  limit?: number;
  offset?: number;
}) {
  const params = new URLSearchParams();
  if (filters?.jobKey) params.set("jobKey", filters.jobKey);
  if (filters?.limit != null) params.set("limit", String(filters.limit));
  if (filters?.offset != null) params.set("offset", String(filters.offset));
  const qs = params.toString();
  return apiRequestJson<CronRunsListResponse>("GET", `/platform/cron-runs${qs ? `?${qs}` : ""}`, {
    platformBearer: true,
    fallbackError: "Impossible de charger l’historique des crons",
  });
}

export async function getPlatformAnalyticsOverview(days?: number) {
  const params = new URLSearchParams();
  if (days != null) params.set("days", String(days));
  const qs = params.toString();
  return apiRequestJson<PlatformAnalyticsOverviewResponse>(
    "GET",
    `/platform/analytics/overview${qs ? `?${qs}` : ""}`,
    {
      platformBearer: true,
      fallbackError: "Impossible de charger l’audience",
    },
  );
}

export async function getPlatformLandingVisits(filters?: {
  days?: number;
  limit?: number;
  offset?: number;
}) {
  const params = new URLSearchParams();
  if (filters?.days != null) params.set("days", String(filters.days));
  if (filters?.limit != null) params.set("limit", String(filters.limit));
  if (filters?.offset != null) params.set("offset", String(filters.offset));
  const qs = params.toString();
  return apiRequestJson<PlatformLandingVisitsResponse>(
    "GET",
    `/platform/analytics/landing-visits${qs ? `?${qs}` : ""}`,
    {
      platformBearer: true,
      fallbackError: "Impossible de charger les visites landing",
    },
  );
}

export async function searchPlatformProspects(filters?: {
  page?: number;
  perPage?: number;
  departement?: string;
  codeNaf?: string;
  preset?: string;
}) {
  const params = new URLSearchParams();
  if (filters?.page != null) params.set("page", String(filters.page));
  if (filters?.perPage != null) params.set("perPage", String(filters.perPage));
  if (filters?.departement) params.set("departement", filters.departement);
  if (filters?.codeNaf) params.set("codeNaf", filters.codeNaf);
  if (filters?.preset) params.set("preset", filters.preset);
  const qs = params.toString();
  return apiRequestJson<PlatformProspectsSearchResponse>(
    "GET",
    `/platform/prospects${qs ? `?${qs}` : ""}`,
    {
      platformBearer: true,
      fallbackError: "Impossible de charger les prospects",
    },
  );
}

export async function getPlatformProspectCredits() {
  return apiRequestJson<PlatformProspectCreditsResponse>("GET", "/platform/prospects/credits", {
    platformBearer: true,
    fallbackError: "Impossible de charger les crédits Pappers",
  });
}

export async function listPlatformTrackedProspects(filters?: { limit?: number; offset?: number }) {
  const params = new URLSearchParams();
  if (filters?.limit != null) params.set("limit", String(filters.limit));
  if (filters?.offset != null) params.set("offset", String(filters.offset));
  const qs = params.toString();
  return apiRequestJson<ProspectOutreachesListResponse>(
    "GET",
    `/platform/prospects/tracked${qs ? `?${qs}` : ""}`,
    {
      platformBearer: true,
      fallbackError: "Impossible de charger les prospects suivis",
    },
  );
}

export async function sendPlatformProspectOutreach(body: PlatformProspectOutreachBody) {
  return apiRequestJson<PlatformProspectOutreachResponse>("POST", "/platform/prospects/outreach", {
    body,
    platformBearer: true,
    fallbackError: "Envoi de l’invitation impossible",
  });
}

export async function markPlatformProspectEmailNotFound(body: PlatformProspectEmailNotFoundBody) {
  return apiRequestJson<{ ok: true }>("POST", "/platform/prospects/email-not-found", {
    body,
    platformBearer: true,
    fallbackError: "Impossible d’enregistrer le statut",
  });
}

export async function savePlatformProspectNote(body: PlatformProspectNoteBody) {
  return apiRequestJson<{ ok: true; comment?: string }>("POST", "/platform/prospects/note", {
    body,
    platformBearer: true,
    fallbackError: "Impossible d’enregistrer le commentaire",
  });
}
