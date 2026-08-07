/** Contrat API users-service (création + validation credentials) */

import type { UserRole } from "./auth";
import type { OrganizationMembershipStatus } from "./organization-membership";
import type { QuickActionBookmark } from "./quick-actions";
import { DEFAULT_QUICK_ACTIONS } from "./quick-actions";

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
  /** Requis sauf si `trustedAuthenticatedUserId` correspond à l’utilisateur (gateway). */
  password?: string;
  name?: string;
  /** Organisation de l'invitation à activer (requis pour multi-org). */
  organizationId: string;
  /**
   * Rempli uniquement par le gateway après vérification JWT :
   * l’appelant est déjà authentifié comme cet utilisateur (2ᵉ org, etc.).
   */
  trustedAuthenticatedUserId?: string;
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
  /** Favoris / actions rapides (URL + libellé, ordre d'affichage). */
  quickActions: QuickActionBookmark[];
  /**
   * Organisations pour lesquelles l’onboarding fondateur (profil + démo) est terminé.
   */
  onboardingCompletedOrganizationIds: string[];
  /**
   * Calculé pour l’organisation courante : true si l’onboarding y est terminé.
   * Rempli par le gateway / users-service selon le contexte org.
   */
  onboardingProfileCompleted: boolean;
  /**
   * Organisations pour lesquelles le guide de démarrage in-app a été ignoré / terminé.
   */
  setupGuideDismissedOrganizationIds: string[];
  /** Calculé pour l’org courante : true si le guide de démarrage ne doit plus s’afficher. */
  setupGuideDismissed: boolean;
}

export const DEFAULT_USER_PREFERENCES: UserPreferences = {
  theme: "light",
  sidebarCollapsed: "expanded",
  quickActions: [...DEFAULT_QUICK_ACTIONS],
  onboardingCompletedOrganizationIds: [],
  onboardingProfileCompleted: false,
  setupGuideDismissedOrganizationIds: [],
  setupGuideDismissed: false,
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
  /**
   * Favoris pour l’organisation courante (`organizationId` requis).
   * Stockés par org — une fiche dossier d’une org ne fuit pas vers une autre.
   */
  quickActions?: QuickActionBookmark[];
  /**
   * Marque l’onboarding terminé (true) pour `organizationId`.
   * `organizationId` est requis lorsque ce champ est fourni.
   */
  onboardingProfileCompleted?: boolean;
  /**
   * Masque le guide de démarrage in-app pour `organizationId`.
   * `organizationId` est requis lorsque ce champ est fourni.
   */
  setupGuideDismissed?: boolean;
  /** Organisation ciblée pour l’onboarding / le guide / les favoris (multi-tenant). */
  organizationId?: string;
}

export interface UserPreferencesResponse {
  userId: string;
  preferences: UserPreferences;
}

/** Première connexion : le client intervient-il lui-même sur le terrain ? */
export interface CompleteOnboardingProfileBody {
  goesOnInterventions: boolean;
}

export interface CompleteOnboardingProfileResponse {
  preferences: UserPreferences;
  /** Présent si un technicien est (ou était déjà) lié au compte. */
  technicianId?: string;
}
