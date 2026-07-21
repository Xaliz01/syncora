/** Types plateforme (backoffice Planwise) */

import type { AuthResponse, AuthUser, LoginBody } from "./auth";
import type { OrganizationResponse } from "./organization";
import type { UserResponse, UserStatus } from "./user";
import type { UserRole } from "./auth";

/** JWT staff plateforme (sous-domaine backoffice). */
export interface PlatformJwtPayload {
  kind: "platform";
  sub: string;
  email: string;
  name?: string;
}

export interface PlatformAuthUser {
  id: string;
  email: string;
  name?: string;
}

export interface PlatformAuthResponse {
  accessToken: string;
  user: PlatformAuthUser;
}

export function isPlatformJwtPayload(payload: unknown): payload is PlatformJwtPayload {
  return (
    typeof payload === "object" &&
    payload !== null &&
    "kind" in payload &&
    (payload as { kind?: unknown }).kind === "platform"
  );
}

/**
 * Emails exacts autorisés (CSV) — ex. `mail@benoistbabin.fr`.
 * Env : PLATFORM_STAFF_EMAILS
 */
export function parsePlatformStaffEmails(raw?: string | null): Set<string> {
  return new Set(
    (raw ?? "")
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean),
  );
}

/**
 * Domaines autorisés (CSV) — défaut `planwise.fr`.
 * Env : PLATFORM_STAFF_EMAIL_DOMAINS
 */
export function parsePlatformStaffEmailDomains(raw?: string | null): Set<string> {
  const parsed = (raw ?? "planwise.fr")
    .split(",")
    .map((d) => d.trim().toLowerCase().replace(/^@/, ""))
    .filter(Boolean);
  return new Set(parsed.length ? parsed : ["planwise.fr"]);
}

export function isPlatformStaffEmail(
  email: string,
  options?: { emails?: string | null; domains?: string | null },
): boolean {
  const normalized = email.trim().toLowerCase();
  if (!normalized.includes("@")) return false;
  const exact = parsePlatformStaffEmails(options?.emails ?? process.env.PLATFORM_STAFF_EMAILS);
  if (exact.has(normalized)) return true;
  const domain = normalized.split("@")[1] ?? "";
  const domains = parsePlatformStaffEmailDomains(
    options?.domains ?? process.env.PLATFORM_STAFF_EMAIL_DOMAINS,
  );
  return domains.has(domain);
}

export interface PlatformOrganizationSummary {
  id: string;
  name: string;
  siret?: string;
  email?: string;
  city?: string;
  createdAt?: string;
  userCount: number;
  lastUserLoginAt?: string;
}

export interface PlatformOrganizationsListResponse {
  organizations: PlatformOrganizationSummary[];
  total: number;
}

export interface PlatformUserSummary {
  id: string;
  email: string;
  name?: string;
  status: UserStatus;
  organizationId?: string;
  organizationName?: string;
  role?: UserRole;
  lastLoginAt?: string;
  createdAt?: string;
}

export interface PlatformUsersListResponse {
  users: PlatformUserSummary[];
  total: number;
}

export interface PlatformOrganizationDetailResponse {
  organization: OrganizationResponse;
  users: PlatformUserSummary[];
  subscription?: {
    status: string;
    planName?: string;
    hasAccess: boolean;
    trialEndsAt?: string;
  };
  integrations: PlatformIntegrationSummary[];
}

export interface PlatformIntegrationSummary {
  organizationId: string;
  organizationName?: string;
  provider: "pennylane" | "qonto" | string;
  connected: boolean;
  authMethod?: "oauth" | "api_token";
  companyName?: string;
  companyId?: string;
  tokenHint?: string;
  connectedAt?: string;
}

export interface PlatformIntegrationsListResponse {
  integrations: PlatformIntegrationSummary[];
  total: number;
}

export interface StartImpersonationBody {
  userId: string;
  organizationId: string;
  /** Motif support (ticket, description) — min. 10 caractères. */
  reason: string;
}

export type PlatformLoginBody = LoginBody;

export type { AuthResponse, AuthUser, UserResponse };
