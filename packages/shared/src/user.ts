/** Contrat API users-service (création + validation credentials) */

import type { UserRole } from "./auth";
import type { OrganizationMembershipStatus } from "./organization-membership";
import type { QuickActionId } from "./quick-actions";
import { DEFAULT_QUICK_ACTION_IDS } from "./quick-actions";

export type UserStatus = "active" | "invited";

export interface CreateUserBody {
  organizationId: string;
  email: string;
  password: string;
  name?: string;
  role: UserRole;
}

/** Création d'un compte sans organisation (onboarding étape 1). */
export interface CreateAccountBody {
  email: string;
  password: string;
  name?: string;
}

/** Réponse compte sans rattachement organisation. */
export interface AccountUserResponse {
  id: string;
  email: string;
  name?: string;
  status: UserStatus;
  emailVerified: boolean;
}

/**
 * Résultat interne users-service → gateway (code OTP une seule fois pour l'e-mail).
 * Ne jamais exposer `emailVerificationCode` au client.
 */
export interface CreateAccountResult {
  user: AccountUserResponse;
  emailVerificationCode: string;
}

export interface IssueEmailVerificationResult {
  email: string;
  emailVerificationCode: string;
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
  organizationMembershipStatus?: OrganizationMembershipStatus;
  createdAt?: string;
  lastLoginAt?: string;
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
  /** Organisation de l'invitation à activer (requis pour multi-org). */
  organizationId: string;
}

/** Indices pour l'écran d'acceptation d'invitation (sans secrets). */
export interface InvitationActivationHintsResponse {
  hasPassword: boolean;
  email: string;
}

/** Mise à jour de l'e-mail d'un utilisateur encore en invitation (membership invited). */
export interface UpdateInvitedUserEmailBody {
  organizationId: string;
  email: string;
}

/** Annulation d'une invitation côté users (soft-delete membership ± user). */
export interface CancelOrganizationInvitationBody {
  organizationId: string;
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
  /** Absent tant que l'utilisateur n'a pas créé ou rejoint une organisation. */
  organizationId?: string;
  email: string;
  name?: string;
  /** Absent si organizationId est absent. */
  role?: UserRole;
  status: UserStatus;
  /** false si le compte self-service n'a pas encore validé son e-mail. */
  emailVerified: boolean;
}

/* ── Mon compte / User Account ─────────────────────────────── */

export type ThemePreference = "light" | "dark";
export type SidebarPreference = "expanded" | "collapsed";

export interface UserPreferences {
  theme: ThemePreference;
  sidebarCollapsed: SidebarPreference;
  /** Actions rapides du tableau de bord (ordre d'affichage). */
  quickActionIds: QuickActionId[];
}

export const DEFAULT_USER_PREFERENCES: UserPreferences = {
  theme: "light",
  sidebarCollapsed: "expanded",
  quickActionIds: [...DEFAULT_QUICK_ACTION_IDS],
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
  quickActionIds?: QuickActionId[];
}

export interface UserPreferencesResponse {
  userId: string;
  preferences: UserPreferences;
}
