/** Contrat API users-service (création + validation credentials) */

import type { UserRole } from "./auth";

export type UserStatus = "active" | "invited";

export interface CreateUserBody {
  organizationId: string;
  email: string;
  password: string;
  name?: string;
  role: UserRole;
}

export interface UserResponse {
  id: string;
  organizationId: string;
  email: string;
  name?: string;
  role: UserRole;
  /** Statut « compte » (actif / legacy invité). Préférer `organizationMembershipStatus` pour le rattachement à l’org. */
  status: UserStatus;
  /** Présent lorsque la réponse est liée à une organisation (liste admin, fiche) : état d’invitation sur cette org. */
  organizationMembershipStatus?: "active" | "invited";
  createdAt?: string;
}

export interface CreateInvitedUserBody {
  organizationId: string;
  email: string;
  name?: string;
  role?: UserRole;
  invitedByUserId: string;
}

export interface ActivateInvitedUserBody {
  password: string;
  name?: string;
}

/** Mise à jour partielle côté serveur (ex. gateway → users-service). */
export interface PatchUserBody {
  /** Organisation active du compte (le rôle par org vit dans organization_memberships). */
  organizationId?: string;
}

export interface ValidateCredentialsBody {
  email: string;
  password: string;
}

export interface ValidateCredentialsResponse {
  id: string;
  organizationId: string;
  email: string;
  name?: string;
  role: UserRole;
  status: UserStatus;
}

/* ── Mon compte / User Account ─────────────────────────────── */

export type ThemePreference = "light" | "dark";
export type SidebarPreference = "expanded" | "collapsed";

export interface UserPreferences {
  theme: ThemePreference;
  sidebarCollapsed: SidebarPreference;
}

export const DEFAULT_USER_PREFERENCES: UserPreferences = {
  theme: "light",
  sidebarCollapsed: "expanded",
};

export interface UpdateUserNameBody {
  name: string;
}

export interface ChangePasswordBody {
  currentPassword: string;
  newPassword: string;
}

export interface UpdateUserPreferencesBody {
  theme?: ThemePreference;
  sidebarCollapsed?: SidebarPreference;
}

export interface UserPreferencesResponse {
  userId: string;
  preferences: UserPreferences;
}
