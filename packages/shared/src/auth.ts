/** Contrat API auth (register / login) */

import type { PermissionCode } from "./permissions";
import type { UserStatus } from "./user";

/** @deprecated Utiliser register-account puis create-organization. Conservé pour compatibilité tests internes. */
export interface RegisterBody {
  organizationName: string;
  organizationSiret: string;
  adminEmail: string;
  adminPassword: string;
  adminName?: string;
}

/** Étape 1 de l'inscription : création du compte admin sans organisation. */
export interface RegisterAccountBody {
  email: string;
  password: string;
  name?: string;
}

/** Réponse après register-account : vérification e-mail requise (pas de JWT). */
export interface EmailVerificationRequiredResponse {
  status: "email_verification_required";
  email: string;
  /**
   * Présent uniquement hors production (SMTP local / debug).
   * Ne jamais s'y fier en production.
   */
  debugVerificationCode?: string;
}

export interface VerifyEmailBody {
  email: string;
  code: string;
}

export interface ResendEmailVerificationBody {
  email: string;
}

export interface ResendEmailVerificationResponse {
  ok: true;
  /** Présent uniquement hors production. */
  debugVerificationCode?: string;
}

/** Profil minimal pendant l'onboarding (pas encore d'organisation). */
export interface OnboardingUser {
  id: string;
  email: string;
  name?: string;
  status: UserStatus;
}

/** JWT limité émis après register-account ; ne donne accès qu'aux routes d'onboarding. */
export interface OnboardingJwtPayload {
  kind: "onboarding";
  sub: string;
  email: string;
  name?: string;
  status: UserStatus;
}

export interface OnboardingAuthResponse {
  accessToken: string;
  user: OnboardingUser;
}

export function isOnboardingJwtPayload(
  payload: JwtPayload | OnboardingJwtPayload,
): payload is OnboardingJwtPayload {
  return "kind" in payload && payload.kind === "onboarding";
}

export interface LoginBody {
  email: string;
  password: string;
}

export interface AuthUser {
  id: string;
  email: string;
  organizationId: string;
  role: UserRole;
  status: UserStatus;
  permissions: PermissionCode[];
  name?: string;
  technicianId?: string;
  /**
   * Premier admin de l’organisation (créateur / membership admin le plus ancien).
   * Sert notamment à l’onboarding profil terrain.
   */
  isFoundingAdmin?: boolean;
  /** Présent pendant une session support (impersonation). */
  impersonatorId?: string;
  impersonatorEmail?: string;
}

export type UserRole = "admin" | "member";

export interface JwtPayload {
  sub: string;
  organizationId: string;
  role: UserRole;
  status: UserStatus;
  permissions: PermissionCode[];
  email: string;
  name?: string;
  technicianId?: string;
  /**
   * Identifiant de session unique. Requis pour les JWT org normaux ;
   * absent / non vérifié pour l'impersonation support.
   */
  sid?: string;
  /** Staff plateforme à l’origine de la session (impersonation). */
  impersonatorId?: string;
  impersonatorEmail?: string;
}

export interface AuthResponse {
  accessToken: string;
  user: AuthUser;
}

export interface SwitchOrganizationBody {
  organizationId: string;
}

/** Message d'erreur stable quand la session JWT n'est plus valide (révoquée / expirée). */
export const SESSION_REPLACED_MESSAGE = "Session expirée ou révoquée";

export interface CreateUserSessionBody {
  userAgent?: string;
}

export interface CreateUserSessionResponse {
  sessionId: string;
}

export interface ValidateUserSessionBody {
  userId: string;
  sessionId: string;
}

export interface ValidateUserSessionResponse {
  valid: boolean;
}

export interface RevokeUserSessionBody {
  sessionId?: string;
}

/** Session appareil listée côté « Mon compte » (sans secrets). */
export interface UserSessionResponse {
  id: string;
  sessionId: string;
  label: string;
  /** Classe d'appareil : au plus une session bureau et une mobile par compte. */
  deviceClass: "desktop" | "mobile";
  userAgent?: string;
  createdAt: string;
  lastSeenAt: string;
  /** true si c'est la session du JWT courant. */
  current: boolean;
}

export interface UserSessionsListResponse {
  sessions: UserSessionResponse[];
}
