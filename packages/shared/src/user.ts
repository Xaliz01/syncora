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
  organizationId?: string;
  /** Rôle dans l’organisation active (aligné sur la ligne de jointure lors d’un switch). */
  role?: UserRole;
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
