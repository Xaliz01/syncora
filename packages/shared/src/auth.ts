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
}

export interface AuthResponse {
  accessToken: string;
  user: AuthUser;
}

export interface SwitchOrganizationBody {
  organizationId: string;
}
